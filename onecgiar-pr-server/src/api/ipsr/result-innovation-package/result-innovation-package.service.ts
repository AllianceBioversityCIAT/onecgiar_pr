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
import { ResultByEvidencesRepository } from '../../../api/results/results_by_evidences/result_by_evidences.repository';
import { ResultByIntitutionsRepository } from '../../../api/results/results_by_institutions/result_by_intitutions.repository';
import { ResultByIntitutionsTypeRepository } from '../../../api/results/results_by_institution_types/result_by_intitutions_type.repository';
import { resultValidationRepository } from '../../../api/results/results-validation-module/results-validation-module.repository';
import { ResultIpSdgTargetRepository } from '../innovation-pathway/repository/result-ip-sdg-targets.repository';
import { ResultInitiativeBudgetRepository } from '../../../api/results/result_budget/repositories/result_initiative_budget.repository';
import { UnitTimeRepository } from './repositories/unit_time.repository';
import { TocResultsRepository } from '../../../toc/toc-results/toc-results.repository';
import { ResultIpEoiOutcomeRepository } from '../innovation-pathway/repository/result-ip-eoi-outcomes.repository';
import { ResultIpEoiOutcome } from '../innovation-pathway/entities/result-ip-eoi-outcome.entity';
import { TocResult } from '../../../toc/toc-results/entities/toc-result.entity';

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
    private readonly _clarisaAAOutcome: ClarisaActionAreaOutcomeRepository,
    private readonly _resultIpAAOutcomeRepository: ResultIpAAOutcomeRepository,
    private readonly _resultIpImpactAreaIndicatorsRespository: ResultsImpactAreaIndicatorRepository,
    private readonly _resultIpImpactAreaRespository: ResultIpImpactAreaRepository,
    private readonly _activeBackstoppingRepository: ActiveBackstoppingRepository,
    private readonly _consensusInitiativeWorkPackageRepository: consensusInitiativeWorkPackageRepository,
    private readonly _regionalIntegratedRepository: RegionalIntegratedRepository,
    private readonly _regionalLeadershipRepository: RegionalLeadershipRepository,
    private readonly _relevantCountryRepositor: RelevantCountryRepository,
    private readonly _resultIpSdgRespository: ResultIpSdgTargetRepository,
    private readonly _resultByEvidencesRepository: ResultByEvidencesRepository,
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultByIntitutionsTypeRepository: ResultByIntitutionsTypeRepository,
    private readonly _resultValidationRepository: resultValidationRepository,
    protected readonly _resultInitiativesBudgetRepository: ResultInitiativeBudgetRepository,
    protected readonly _unitTimeRepository: UnitTimeRepository,
    protected readonly _tocResult: TocResultsRepository,
    protected readonly _resultIpEoiOutcomesRepository: ResultIpEoiOutcomeRepository,
  ) { }

  async findUnitTime() {
    try {
      const unit_time = await this._unitTimeRepository.find();
      return {
        response: unit_time,
        message: 'Successful response',
        status: HttpStatus.OK,
      };
    } catch (error) {
      return this._handlersError.returnErrorRes({ error, debug: true });
    }
  }

  async findRelevantCountry() {
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

  async findRegionalLeadership() {
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

  async findRegionalIntegrated() {
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

  async findConsensusInitiativeWorkPackage() {
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

  async findActiveBackstopping() {
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

  async createHeader(CreateResultInnovationPackageDto: CreateResultInnovationPackageDto, user: TokenDto) {
    try {
      let innovationTitle: string;
      let innovationGeoScope: number;

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

      const initiativeRole = await this._resultByInitiativeRepository.InitiativeByResult(+resultExist.id);
      const mapInits = initiativeRole.find(i => i.inititiative_id === CreateResultInnovationPackageDto.initiative_id);

      if (!mapInits) {
        return {
          response: mapInits,
          message: 'If your initiative is not primary or does not contribute to the Core Innovation, you cannot create an Innovatio Package with the result.',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      if (!CreateResultInnovationPackageDto.initiative_id) {
        throw {
          response: `Initiative id: ${CreateResultInnovationPackageDto.initiative_id}`,
          message: 'Please enter a Initiative Official Code to create a new Innovation Package',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      if (!CreateResultInnovationPackageDto.geo_scope_id) {
        throw {
          response: `Geo Scope id: ${CreateResultInnovationPackageDto.geo_scope_id}`,
          message: 'Please enter a Geo Scope to create a new Innovation Package',
          status: HttpStatus.BAD_REQUEST,
        };
      }

      const version = await this._versionsService.findBaseVersion();
      if (version.status >= 300) {
        throw this._handlersError.returnErrorRes({
          error: version,
          debug: true,
        });
      }

      const result = resultExist;
      if (result.result_type_id != 7) {
        throw {
          response: result.result_type_id,
          message: 'This is not a valid result type. Only Innovation Develpments can be used to create a new Innovation Package.',
          status: HttpStatus.BAD_REQUEST,
        };
      }
      const vrs: Version = <Version>version.response;

      const last_code = await this._resultRepository.getLastResultCode();
      const regions = CreateResultInnovationPackageDto.regions;
      const countries = CreateResultInnovationPackageDto.countries;

      if (CreateResultInnovationPackageDto.geo_scope_id === 1) {
        innovationGeoScope = 1;
      } else if (CreateResultInnovationPackageDto.geo_scope_id === 2) {
        innovationGeoScope = 2;
      } else if (countries?.length > 1) {
        innovationGeoScope = 3
      } else {
        innovationGeoScope = 4
      }

      if (CreateResultInnovationPackageDto.geo_scope_id === 2) {
        const regionsList = regions.map(r => r.name);
        innovationTitle = `Innovation Packaging and Scaling Readiness assessment for ${result.title} in ${regionsList.slice(0, -1).join(', ')}${regionsList.length > 1 ? ' and ' : ''}${regionsList[regionsList.length - 1]}`;
      } else if (CreateResultInnovationPackageDto.geo_scope_id === 3 || CreateResultInnovationPackageDto.geo_scope_id === 4) {
        const countriesList = countries.map(c => c.name);
        innovationTitle = `Innovation Packaging and Scaling Readiness assessment for ${result.title} in ${countriesList.slice(0, -1).join(', ')}${countriesList.length > 1 ? ' and ' : ''}${countriesList[countriesList.length - 1]}`;
      } else {
        innovationTitle = `Innovation Packaging and Scaling Readiness assessment for ${result.title}.`;
      }


      const titleValidate = await this._resultRepository
        .createQueryBuilder('result')
        .where('result.title like :title AND is_active = true', { title: `${innovationTitle}` })
        .getMany();

      if (titleValidate.length) {
        throw {
          response: titleValidate.map(tv => tv.id),
          message: `The title already exists, in the following result: ${titleValidate.map(tv => tv.result_code)}. Please change the Regions or Countries.`,
          status: HttpStatus.BAD_REQUEST,
        }
      }

      const newInnovationHeader = await this._resultRepository.save({
        result_code: last_code + 1,
        title: innovationTitle,
        reported_year_id: result.reported_year_id,
        result_level_id: result.result_level_id,
        result_type_id: 10,
        has_regions: regions
          ? true
          : false,
        has_countries: countries
          ? true
          : false,
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

      const newResult = newInnovationHeader.id;
      const newInnovationByInitiative = await this._resultByInitiativeRepository.save({
        result_id: newResult,
        initiative_id: CreateResultInnovationPackageDto.initiative_id,
        initiative_role_id: 1,
        version_id: vrs.id,
        created_by: user.id,
        last_updated_by: user.id
      });

      const resultByInitiativesId = newInnovationByInitiative.id;
      const newresultInitiativeBudget = await this._resultInitiativesBudgetRepository.save({
        result_initiative_id: resultByInitiativesId,
        version_id: vrs.id,
        created_by: user.id,
        last_updated_by: user.id,
      });

      const newResultInnovationPackage = await this._resultInnovationPackageRepository.save({
        result_innovation_package_id: newResult,
        version_id: vrs.id,
        created_by: user.id,
        last_updated_by: user.id,
      });

      const newInnovationByResult = await this._innovationByResultRepository.save({
        result_innovation_package_id: newResult,
        result_id: result.id,
        ipsr_role_id: 1,
        version_id: vrs.id,
        created_by: user.id,
        last_updated_by: user.id
      });
      const resultByInnivationPackage = newInnovationByResult.result_by_innovation_package_id;

      let resultRegions: ResultRegion[] = [];
      let resultCountries: ResultCountry[] = [];

      if (CreateResultInnovationPackageDto.geo_scope_id === 2) {
        if (regions) {
          for (let i = 0; i < regions.length; i++) {
            const newRegions = new ResultRegion();
            newRegions.result_id = newResult;
            newRegions.region_id = regions[i].id;
            newRegions.is_active = true;
            resultRegions.push(newRegions);
          }
        }
      } else if (CreateResultInnovationPackageDto.geo_scope_id === 3 || CreateResultInnovationPackageDto.geo_scope_id === 4) {
        if (countries) {
          for (let i = 0; i < countries.length; i++) {
            const newCountries = new ResultCountry();
            newCountries.result_id = newResult;
            newCountries.country_id = countries[i].id;
            newCountries.is_active = true;
            resultCountries.push(newCountries);
          }
        }
      }
      const newInnovationRegions = await this._resultRegionRepository.save(resultRegions);
      const newInnovationCountries = await this._resultCountryRepository.save(resultCountries);
      // ! This method it's no necesary
      // const retrievedEoi = await this.retrievedEoi(CreateResultInnovationPackageDto.initiative_id, user.id, resultByInnivationPackage, vrs.id);
      const retriveAAOutcome = await this.retrievedAAOutcome(CreateResultInnovationPackageDto.initiative_id, user.id, resultByInnivationPackage, vrs.id);
      const retrievedImpactArea = await this.retrievedImpactArea(result.id, user.id, resultByInnivationPackage, vrs.id);

      await this._resultInnovationPackageRepository.update(
        newResultInnovationPackage.result_innovation_package_id,
        {
          relevant_country_id: await this.defaultRelevantCountry(result.geographic_scope_id, result.id),
          regional_leadership_id: result.geographic_scope_id == 1 ? 3 : null,
          regional_integrated_id: result.geographic_scope_id == 1 ? 3 : null
        }
      )


      return {
        response: {
          newInnovationHeader,
          // retrievedEoi,
          retriveAAOutcome,
          retrievedImpactArea,
          newInnovationByInitiative,
          newresultInitiativeBudget,
          newResultInnovationPackage,
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

  async defaultRelevantCountry(geoscope: number, resultId: number) {
    if ([1, 2, 3, 4].includes(geoscope)) {
      if ([1, 2].includes(geoscope)) {
        return 3;
      }
      if ([3, 4].includes(geoscope)) {
        const rc = await this._resultCountryRepository.findOne({ where: { result_id: resultId, is_active: true } });
        return rc ? 3 : null;
      }
    }
    return null;
  }

  // async retrievedEoi(initId: number, user: number, resultByIpId: number, version: number) {
  //   try {
  //     let saveEoiOutcome: any;
  //     const searchEoi: TocResult[] = await this._tocResult.getEoiIp(initId);

  //     if (!searchEoi.length) {
  //       return {
  //         response: { valid: true },
  //         message: 'No End of Initiative Outcomes were found'
  //       }
  //     }


  //     for (const eoi of searchEoi) {
  //       const newEoi = new ResultIpEoiOutcome();
  //       newEoi.toc_result_id = eoi.toc_result_id;
  //       newEoi.result_by_innovation_package_id = resultByIpId;
  //       newEoi.created_by = user;
  //       newEoi.last_updated_by = user;
  //       newEoi.version_id = version;
  //       newEoi.created_date = new Date();
  //       newEoi.last_updated_date = new Date();
  //       saveEoiOutcome = await this._resultIpEoiOutcomesRepository.save(newEoi);
  //     }

  //     return {
  //       response: {
  //         saveEoiOutcome
  //       },
  //       message: 'Successfully created',
  //       status: HttpStatus.OK
  //     }

  //   } catch (error) {
  //     return this._handlersError.returnErrorRes({ error, debug: true });
  //   }
  // }

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
      const searchImpactDataInResult = await this._resultIpImpactAreaIndicatorsRespository.findBy({ result_id: id });
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

      const titleValidate = await this._resultRepository
        .createQueryBuilder('result')
        .where('result.title like :title', { title: `${req.title}` })
        .andWhere('result.is_active = 1')
        .getMany();

      if (titleValidate.length > 1) {
        if (!titleValidate.find((tv) => tv.id === resultId)) {
          throw {
            response: titleValidate.map((tv) => tv.id),
            message: `The title already exists, in the following results: ${titleValidate.map(
              (tv) => tv.result_code,
            )}`,
            status: HttpStatus.BAD_REQUEST,
          };
        }
      }

      const updateResult = await this._resultRepository.update(resultId, {
        title: req?.title,
        description: req?.description,
        lead_contact_person: req?.lead_contact_person,
        gender_tag_level_id: req?.gender_tag_level_id,
        climate_change_tag_level_id: req?.climate_change_tag_level_id,
        is_krs: req?.is_krs,
        krs_url: req?.krs_url,
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

  async delete(resultId: number, user: TokenDto) {
    const resultToUpdate = await this._resultRepository.find({
      where: { id: resultId }
    });

    if (!resultToUpdate) {
      return {
        response: { valid: false },
        message: 'The result was not found',
        status: HttpStatus.NOT_FOUND,
      };
    }

    const resultByInnovationPackageToUpdate = await this._innovationByResultRepository.find({
      where: { result_innovation_package_id: resultId, is_active: true }
    });

    const id = resultToUpdate[0].id;
    const result_by_innovation_package_id = resultByInnovationPackageToUpdate[0].result_by_innovation_package_id;

    const result = await this._resultRepository.update({ id }, { is_active: false, last_updated_date: new Date(), last_updated_by: user.id });
    const regions = await this._resultRegionRepository.update({ result_id: id }, { is_active: false, last_updated_date: new Date() });
    const countries = await this._resultCountryRepository.update({ result_id: id }, { is_active: false, last_updated_date: new Date() });
    const resultByInit = await this._resultByInitiativeRepository.update({ result_id: id }, { is_active: false, last_updated_date: new Date(), last_updated_by: user.id });
    const resultByInnoPackage = await this._innovationByResultRepository.update({ result_id: id }, { is_active: false, last_updated_date: new Date(), last_updated_by: user.id });
    const resultInnoPackage = await this._resultInnovationPackageRepository.update({ result_innovation_package_id: id }, { is_active: false, last_updated_date: new Date(), last_updated_by: user.id });
    const resultByInstitutionsType = await this._resultByIntitutionsTypeRepository.update({ results_id: id }, { is_active: false, last_updated_date: new Date(), last_updated_by: user.id });
    const resultBInstitutions = await this._resultByIntitutionsRepository.update({ result_id: id }, { is_active: false, last_updated_date: new Date(), last_updated_by: user.id });
    const resultByevidencce = await this._resultByEvidencesRepository.update({ results_id: id }, { is_active: false, last_updated_date: new Date(), last_updated_by: user.id });
    const resultValidattion = await this._resultValidationRepository.update({ results_id: id }, { is_active: false, last_updated_date: new Date() });
    const resultIpAAOutcome = await this._resultIpAAOutcomeRepository.update({ result_by_innovation_package_id }, { is_active: false, last_updated_date: new Date(), last_updated_by: user.id });
    const resultIpImpactArea = await this._resultIpImpactAreaRespository.update({ result_by_innovation_package_id }, { is_active: false, last_updated_date: new Date(), last_updated_by: user.id });
    const resultIpSdg = await this._resultIpSdgRespository.update({ result_by_innovation_package_id }, { is_active: false, last_updated_date: new Date(), last_updated_by: user.id });

    return {
      response: {
        result,
        regions,
        countries,
        resultByInit,
        resultByInnoPackage,
        resultInnoPackage,
        resultByInstitutionsType,
        resultBInstitutions,
        resultByevidencce,
        resultValidattion,
        resultIpAAOutcome,
        resultIpImpactArea,
        resultIpSdg,
      },
      message: 'The result was deleted successfully',
      status: HttpStatus.ACCEPTED
    }
  }
}
