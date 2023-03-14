import { HttpStatus, Injectable } from '@nestjs/common';
import { HandlersError } from 'src/shared/handlers/error.utils';
import { ResultRepository } from '../../../api/results/result.repository';
import { TokenDto } from '../../../shared/globalInterfaces/token.dto';
import { CreateResultInnovationPackageDto } from './dto/create-result-innovation-package.dto';
import { Version } from '../../results/versions/entities/version.entity';
import { VersionsService } from '../../../api/results/versions/versions.service';
import { ResultRegion } from '../../../api/results/result-regions/entities/result-region.entity';
import { ResultRegionRepository } from '../../../api/results/result-regions/result-regions.repository';
import { ResultByInitiativesRepository } from '../../../api/results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultCountry } from '../../../api/results/result-countries/entities/result-country.entity';
import { ResultCountryRepository } from '../../../api/results/result-countries/result-countries.repository';
import { IpsrRepository } from '../ipsr.repository';
import { ResultTypeRepository } from 'src/api/results/result_types/resultType.repository';

@Injectable()
export class ResultInnovationPackageService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultRepository: ResultRepository,
    private readonly _versionsService: VersionsService,
    private readonly _resultByInitiativeRepository: ResultByInitiativesRepository,
    private readonly _resultRegionRepository: ResultRegionRepository,
    private readonly _resultCountryRepository: ResultCountryRepository,
    private readonly _innovationByResultRepository: IpsrRepository
  ) { }

  async createHeader(CreateResultInnovationPackageDto: CreateResultInnovationPackageDto, user: TokenDto) {
    try {
      let innovationTitle: string;

      // * Check if result already exists
      const resultExist =
        await this._resultRepository.getResultById(
          CreateResultInnovationPackageDto.result_id
        );
      if (!resultExist) {
        throw {
          response: resultExist,
          message: 'The result was not found',
          status: HttpStatus.NOT_FOUND,
        };
      }

      // * Validate that initiative id is coming.
      if (!CreateResultInnovationPackageDto.initiative_id) {
        throw {
          response: `Initiative id: ${CreateResultInnovationPackageDto.initiative_id}`,
          message: 'Please enter a Initiative Official Code to create a new Innovation Package',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      // * Validate that geo scope id is coming
      if (!CreateResultInnovationPackageDto.geo_scope_id) {
        throw {
          response: `Geo Scope id: ${CreateResultInnovationPackageDto.geo_scope_id}`,
          message: 'Please enter a Geo Scope to create a new Innovation Package',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      // * Check for the active version
      const version = await this._versionsService.findBaseVersion();
      if (version.status >= 300) {
        throw this._handlersError.returnErrorRes({
          error: version,
          debug: true,
        });
      }

      // * Extract the result and version
      const result = resultExist;
      if (result.result_type_id != 2) {
        throw {
          response: result.result_type_id,
          message: 'This is not a valid result type. Only Innovation Use can be used to create a new Innovation Package.',
          status: HttpStatus.BAD_REQUEST,
        };
      }
      const vrs: Version = <Version>version.response;

      // * Obtain last result code in the list
      const last_code = await this._resultRepository.getLastResultCode();
      // * Obtain the regions in the body
      const regions = CreateResultInnovationPackageDto.regions;
      // * Obtain the countries in the body
      const countries = CreateResultInnovationPackageDto.countries;

      // TODO: ADD THE NAME REPLACE THE ID
      // * Validate the Geo Scope to concat the regions or countries in the title.
      if (CreateResultInnovationPackageDto.geo_scope_id === 2) {
        innovationTitle = `Innovation Packaging and Scaling Readiness assessment for ${result.title} in ${regions.map(r => r.id).join(', ')}`;
      } else if (CreateResultInnovationPackageDto.geo_scope_id === 3) {
        innovationTitle = `Innovation Packaging and Scaling Readiness assessment for ${result.title} in ${countries.map(c => c.id).join(', ')}`;
      } else {
        innovationTitle = `Innovation Packaging and Scaling Readiness assessment for ${result.title}`;
      }

      // * Find a title like it´s incoming from the request.
      const titleValidate = await this._resultRepository
        .createQueryBuilder('result')
        .where('result.title like :title', { title: `${innovationTitle}` })
        .getMany();

      // * Validate if the title is duplicate
      if (titleValidate.length) {
        throw {
          response: titleValidate.map(tv => tv.id),
          message: `The title already exists, in the following result: ${titleValidate.map(tv => tv.result_code)}`,
          status: HttpStatus.BAD_REQUEST,
        }
      }

      // * Create new result 
      const newInnovationHeader = await this._resultRepository.save({
        result_code: last_code + 1,
        title: innovationTitle,
        description: result.description,
        reported_year_id: result.reported_year_id,
        result_level_id: result.result_level_id,
        result_type_id: 10,
        has_regions: regions
          ? true
          : false,
        has_countries: countries
          ? true
          : false,
        geo_scope_id: CreateResultInnovationPackageDto.geo_scope_id,
        initiative_id: CreateResultInnovationPackageDto.initiative_id,
        gender_tag_level_id: result.gender_tag_level_id,
        climate_change_tag_level_id: result.climate_change_tag_level_id,
        is_krs: result.is_krs,
        krs_url: result.krs_url,
        version_id: vrs.id,
        created_by: user.id,
        last_updated_by: user.id,
      });

      // * Extract the result id from the new result response
      const newResult = newInnovationHeader.id;
      // * Save the result by initiative record
      const newInnovationByInitiative = await this._resultByInitiativeRepository.save({
        result_id: newResult,
        initiative_id: CreateResultInnovationPackageDto.initiative_id,
        initiative_role_id: 1,
        version_id: vrs.id,
        created_by: user.id,
        last_updated_by: user.id,
      });

      // * Save new result into innovation by result
      const newInnovationByResult = await this._innovationByResultRepository.save({
        ipsr_result_id: newResult,
        result_id: result.id,
        ipsr_role_id: 1,
        version_id: vrs.id,
        created_by: user.id,
        last_updated_by: user.id
      });

      let resultRegions: ResultRegion[] = [];
      let resultCountries: ResultCountry[] = [];

      //  TODO: PENDING VALIDATION FOR MULTI-NATIONAL !!!!!!!!!!!!!!!!!!!

      // * Validate if geo scope  is regional
      if (CreateResultInnovationPackageDto.geo_scope_id === 2) {
        if (regions) {
          // * Iterate into the regions to save them
          for (let i = 0; i < regions.length; i++) {
            const newRegions = new ResultRegion();
            newRegions.result_id = newResult;
            newRegions.region_id = regions[i].id;
            newRegions.is_active = true;
            resultRegions.push(newRegions);
          }
        }
        // * Validate if geo scope  is national or  multination
      } else if (CreateResultInnovationPackageDto.geo_scope_id === 3) {
        if (countries) {
          // * Iterate into the countries to save them
          for (let i = 0; i < countries.length; i++) {
            const newCountries = new ResultCountry();
            newCountries.result_id = newResult;
            newCountries.country_id = countries[i].id;
            newCountries.is_active = true;
            resultCountries.push(newCountries);
          }
        }
      }
      // * Save the regions
      const newInnovationRegions = await this._resultRegionRepository.save(resultRegions);
      // * Save the countries
      const newInnovationCountries = await this._resultCountryRepository.save(resultCountries);

      return {
        response: {
          newInnovationHeader,
          newInnovationByInitiative,
          newInnovationByResult,
          newInnovationRegions,
          newInnovationCountries
        },
        message: 'Successfully created',
        status: HttpStatus.OK
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async generalInformation(resultId: number, updateResultInnovationPackageDto: any, user: TokenDto) {
    try {
      const resultExist = await this._resultRepository.findOneBy({ id: resultId });
      const req = updateResultInnovationPackageDto;

      // * Find a title like it´s incoming from the request.
      const titleValidate = await this._resultRepository
        .createQueryBuilder('result')
        .where('result.title like :title', { title: `${req.title}` })
        .getMany();

      // * Validate if the title is duplicate
      if (!titleValidate.find(tv => tv.id === resultId)) {
        throw {
          response: titleValidate.map(tv => tv.id),
          message: `The title already exists, in the following results: ${titleValidate.map(tv => tv.result_code)}`,
          status: HttpStatus.BAD_REQUEST,
        }
      }

      const updateResult = await this._resultRepository.update(resultId, {
        title: req.title,
        description: req.description || resultExist.description,
        lead_contact_person: req.lead_contact_person,
        gender_tag_level_id: req.gender_tag_level_id,
        climate_change_tag_level_id: req.climate_change_tag_level_id,
        is_krs: req.is_krs,
        krs_url: req.krs_url,
        geographic_scope_id: resultExist.geographic_scope_id,
        last_updated_by: user.id
      });

      return {
        response: updateResult,
        message: 'Successfully updated',
        status: HttpStatus.OK
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

}
