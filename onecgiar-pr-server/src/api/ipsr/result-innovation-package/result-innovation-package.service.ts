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
      if(result.result_type_id != 2) {
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
      // * Create new result 
      const newInnovationHeader = await this._resultRepository.save({
        result_code: last_code + 1,
        title: result.title,
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
      // * Save the regions
      const newInnovationRegions = await this._resultRegionRepository.save(resultRegions);

      let resultCountries: ResultCountry[] = [];
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

      const updateResult = await this._resultRepository.update(resultId, {
        title: req.title || resultExist.title,
        description: req.description || resultExist.description,
        lead_contact_person: req.lead_contact_person || resultExist.lead_contact_person,
        gender_tag_level_id: req.gender_tag_level_id || resultExist.gender_tag_level_id,
        climate_change_tag_level_id: req.climate_change_tag_level_id || resultExist.climate_change_tag_level_id,
        is_krs: req.is_krs || resultExist.is_krs,
        krs_url: req.krs_url || resultExist.is_krs,
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
