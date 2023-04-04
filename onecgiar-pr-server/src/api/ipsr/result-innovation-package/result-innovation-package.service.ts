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
import { ResultInnovationPackageRepository } from './repositories/result-innovation-package.repository';
import { ResultIpAAOutcomeRepository } from '../innovation-pathway/repository/result-ip-action-area-outcome.repository';
import { ClarisaActionAreaOutcomeRepository } from '../../../clarisa/clarisa-action-area-outcome/clarisa-action-area-outcome.repository';
import { In } from 'typeorm';
import { ResultIpAAOutcome } from '../innovation-pathway/entities/result-ip-action-area-outcome.entity';
import { ResultsImpactAreaIndicatorRepository } from 'src/api/results/results-impact-area-indicators/results-impact-area-indicators.repository';
import { ResultIpImpactArea } from '../innovation-pathway/entities/result-ip-impact-area.entity';
import { ResultIpImpactAreaRepository } from '../innovation-pathway/repository/result-ip-impact-area-targets.repository';
import { ActiveBackstoppingRepository } from './repositories/active-backstopping.repository';
import { consensusInitiativeWorkPackageRepository } from './repositories/consensus-initiative-work-package.repository';
import { RegionalIntegratedRepository } from './repositories/regional-integrated.repository';
import { RegionalLeadershipRepository } from './repositories/regional-leadership.repository';
import { RelevantCountryRepository } from './repositories/relevant-country.repository';

@Injectable()
export class ResultInnovationPackageService {
  constructor(
    private readonly _handlersError: HandlersError,
    private readonly _resultRepository: ResultRepository,
    private readonly _versionsService: VersionsService,
    private readonly _resultByInitiativeRepository: ResultByInitiativesRepository,
    private readonly _resultRegionRepository: ResultRegionRepository,
    private readonly _resultCountryRepository: ResultCountryRepository,
    private readonly _innovationByResultRepository: IpsrRepository,
    private readonly _resultInnovationPackageRepository: ResultInnovationPackageRepository,
    private readonly _resultIpAAOutcomeRepository: ResultIpAAOutcomeRepository,
    private readonly _clarisaAAOutcome: ClarisaActionAreaOutcomeRepository,
    private readonly _resultImpactAreaIndicatorsRespository: ResultsImpactAreaIndicatorRepository,
    private readonly _resultIpImpactAreaRespository: ResultIpImpactAreaRepository,
    private readonly _activeBackstoppingRepository: ActiveBackstoppingRepository,
    private readonly _consensusInitiativeWorkPackageRepository: consensusInitiativeWorkPackageRepository,
    private readonly _regionalIntegratedRepository: RegionalIntegratedRepository,
    private readonly _regionalLeadershipRepository: RegionalLeadershipRepository,
    private readonly _relevantCountryRepositor: RelevantCountryRepository
  ) { }

  async findRelevantCountry(){
    try {
      const request = await this._relevantCountryRepositor.find();
      return {
        response: request,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findRegionalLeadership(){
    try {
      const request = await this._regionalLeadershipRepository.find();
      return {
        response: request,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findRegionalIntegrated(){
    try {
      const request = await this._regionalIntegratedRepository.find();
      return {
        response: request,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findConsensusInitiativeWorkPackage(){
    try {
      const request = await this._consensusInitiativeWorkPackageRepository.find();
      return {
        response: request,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findActiveBackstopping(){
    try {
      const request = await this._activeBackstoppingRepository.find();
      return {
        response: request,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async createHeader(
    CreateResultInnovationPackageDto: CreateResultInnovationPackageDto,
    user: TokenDto,
  ) {
    try {
      let innovationTitle: string;
      let innovationGeoScope: number;

      // * Check if result already exists
      const resultExist = await this._resultRepository.getResultById(
        CreateResultInnovationPackageDto.result_id,
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
          message:
            'Please enter a Initiative Official Code to create a new Innovation Package',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      // * Validate that geo scope id is coming
      if (!CreateResultInnovationPackageDto.geo_scope_id) {
        throw {
          response: `Geo Scope id: ${CreateResultInnovationPackageDto.geo_scope_id}`,
          message:
            'Please enter a Geo Scope to create a new Innovation Package',
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
      if (result.result_type_id != 7) {
        throw {
          response: result.result_type_id,
          message: 'This is not a valid result type. Only Innovation Developments can be used to create a new Innovation Package.',
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

      // * Check Geo Scope
      if (CreateResultInnovationPackageDto.geo_scope_id === 1) {
        innovationGeoScope = 1;
      } else if (CreateResultInnovationPackageDto.geo_scope_id === 2) {
        innovationGeoScope = 2;
      } else if (countries?.length > 1) {
        innovationGeoScope = 3;
      } else {
        innovationGeoScope = 4;
      }

      // * Validate the Geo Scope to concat the regions or countries in the title.
      if (CreateResultInnovationPackageDto.geo_scope_id === 2) {
        innovationTitle = `Innovation Packaging and Scaling Readiness assessment for ${
          result.title
        } in ${regions.map((r) => r.name).join(', ')}`;
      } else if (CreateResultInnovationPackageDto.geo_scope_id === 3) {
        innovationTitle = `Innovation Packaging and Scaling Readiness assessment for ${
          result.title
        } in ${countries.map((c) => c.name).join(', ')}`;
      } else {
        innovationTitle = `Innovation Packaging and Scaling Readiness assessment for ${result.title}.`;
      }

      // * Find a title like it´s incoming from the request.
      const titleValidate = await this._resultRepository
        .createQueryBuilder('result')
        .where('result.title like :title', { title: `${innovationTitle}` })
        .getMany();

      // * Validate if the title is duplicate
      if (titleValidate.length) {
        throw {
          response: titleValidate.map((tv) => tv.id),
          message: `The title already exists, in the following result: ${titleValidate.map(
            (tv) => tv.result_code,
          )}. Please change the Regions or Countries.`,
          status: HttpStatus.BAD_REQUEST,
        };
      }

      // * Create new result
      const newInnovationHeader = await this._resultRepository.save({
        result_code: last_code + 1,
        title: innovationTitle,
        description: result.description,
        reported_year_id: result.reported_year_id,
        result_level_id: result.result_level_id,
        result_type_id: 10,
        has_regions: regions ? true : false,
        has_countries: countries ? true : false,
        geographic_scope_id: innovationGeoScope,
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
        last_updated_by: user.id
      });

      // * Save the result in the result innovation package
      const newResultInnovationPackage = await this._resultInnovationPackageRepository.save({
        result_innovation_package_id: newResult,
        version_id: vrs.id,
        created_by: user.id,
        last_updated_by: user.id,
      });

      // * Save new result into result BY innovation package
      const newInnovationByResult = await this._innovationByResultRepository.save({
        result_innovation_package_id: newResult,
        result_id: result.id,
        ipsr_role_id: 1,
        version_id: vrs.id,
        created_by: user.id,
        last_updated_by: user.id
      });
      const resultByInnivationPackage = newInnovationByResult.result_by_innovation_package_id;

      const resultRegions: ResultRegion[] = [];
      const resultCountries: ResultCountry[] = [];

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
      } else if (
        CreateResultInnovationPackageDto.geo_scope_id === 3 ||
        CreateResultInnovationPackageDto.geo_scope_id === 4
      ) {
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
      const newInnovationRegions = await this._resultRegionRepository.save(
        resultRegions,
      );
      // * Save the countries
      const newInnovationCountries = await this._resultCountryRepository.save(
        resultCountries,
      );

      // * Map the AAOutcomes
      const retriveAAOutcome = await this.retrievedAAOutcome(CreateResultInnovationPackageDto.initiative_id, user.id, resultByInnivationPackage, vrs.id);

      const retrievedImpactArea = await this.retrievedImpactArea(result.id, user.id, resultByInnivationPackage, vrs.id);

      return {
        response: {
          newInnovationHeader,
          retriveAAOutcome,
          newInnovationByInitiative,
          newResultInnovationPackage,
          newInnovationByResult,
          newInnovationRegions,
          newInnovationCountries,
        },
        message: 'Successfully created',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async retrievedAAOutcome(initId: number, user: number, resultByIpId: number, version: number) {
    try {
      let saveAAOutcome: any;
      const searchTocData = await this._resultIpAAOutcomeRepository.mapActionAreaOutcome(initId);
      const smoAAOutcomeToc = searchTocData.map(stc => stc.outcome_smo_code);
      const mapAAOutcome = await this._clarisaAAOutcome.find({
        where: { outcomeSMOcode: In(smoAAOutcomeToc) }
      });

      for (const data of mapAAOutcome) {
        const newAAOutcome = new ResultIpAAOutcome();
        newAAOutcome.action_area_outcome_id = data.id;
        newAAOutcome.result_by_innovation_package_id = resultByIpId;
        newAAOutcome.created_by = user;
        newAAOutcome.last_updated_by = user;
        newAAOutcome.version_id = version;
        newAAOutcome.created_date = new Date();
        newAAOutcome.last_updated_date = new Date();
        saveAAOutcome = await this._resultIpAAOutcomeRepository.save(newAAOutcome);
      }
      return {
        response: {
          saveAAOutcome
        },
        message: 'Successfully created',
        status: HttpStatus.OK
      }
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async retrievedImpactArea(resultId: number, user: number, resultByIpId: number, version: number) {
    const id = resultId;
    try {
      let savImpactArea: any;
      const searchImpactDataInResult = await this._resultImpactAreaIndicatorsRespository.findBy({ result_id: id });
      const mapImpactsIds = searchImpactDataInResult.map(sid => sid.impact_area_indicator_id);

      for (const data of mapImpactsIds) {
        const newImpactArea = new ResultIpImpactArea();
        newImpactArea.impact_area_indicator_id = data;
        newImpactArea.result_by_innovation_package_id = resultByIpId;
        newImpactArea.created_by = user;
        newImpactArea.last_updated_by = user;
        newImpactArea.version_id = version;
        newImpactArea.created_date = new Date();
        newImpactArea.last_updated_date = new Date();
        savImpactArea = await this._resultIpImpactAreaRespository.save(newImpactArea);
      }
      return {
        response: {
          savImpactArea
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
      const resultExist = await this._resultRepository.findOneBy({
        id: resultId,
      });
      const req = updateResultInnovationPackageDto;

      // * Find a title like it´s incoming from the request.
      const titleValidate = await this._resultRepository
        .createQueryBuilder('result')
        .where('result.title like :title', { title: `${req.title}` })
        .andWhere('result.is_active = 1')
        .getMany();

      // * Validate if the title is duplicate
      if (!titleValidate.find((tv) => tv.id === resultId)) {
        throw {
          response: titleValidate.map((tv) => tv.id),
          message: `The title already exists, in the following results: ${titleValidate.map(
            (tv) => tv.result_code,
          )}`,
          status: HttpStatus.BAD_REQUEST,
        };
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
        last_updated_by: user.id,
      });

      return {
        response: updateResult,
        message: 'Successfully updated',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }
}
