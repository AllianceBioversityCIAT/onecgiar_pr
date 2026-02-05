import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { CreateVersioningDto } from './dto/create-versioning.dto';
import { UpdateVersioningDto } from './dto/update-versioning.dto';
import { Version } from './entities/version.entity';
import { VersionRepository } from './versioning.repository';
import { Result } from '../results/entities/result.entity';
import { ResultRepository } from '../results/result.repository';
import { ApplicationModules } from './entities/application-modules.entity';
import { ApplicationModulesRepository } from './repositories/application-modules.repository';
import { ReturnResponseDto } from '../../shared/handlers/error.utils';
import { TokenDto } from '../../shared/globalInterfaces/token.dto';
import { NonPooledProjectRepository } from '../results/non-pooled-projects/non-pooled-projects.repository';
import { ResultsCenterRepository } from '../results/results-centers/results-centers.repository';
import { ResultByInitiativesRepository } from '../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultByIntitutionsRepository } from '../results/results_by_institutions/result_by_intitutions.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultByIntitutionsTypeRepository } from '../results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultCountryRepository } from '../results/result-countries/result-countries.repository';
import { ResultRegionRepository } from '../results/result-regions/result-regions.repository';
import { LinkedResultRepository } from '../results/linked-results/linked-results.repository';
import { EvidencesRepository } from '../results/evidences/evidences.repository';
import { ResultsCapacityDevelopmentsRepository } from '../results/summary/repositories/results-capacity-developments.repository';
import { ResultsImpactAreaIndicatorRepository } from '../results/results-impact-area-indicators/results-impact-area-indicators.repository';
import { ResultsPolicyChangesRepository } from '../results/summary/repositories/results-policy-changes.repository';
import { ResultsInnovationsDevRepository } from '../results/summary/repositories/results-innovations-dev.repository';
import { ResultsInnovationsUseRepository } from '../results/summary/repositories/results-innovations-use.repository';
import { ResultsInnovationsUseMeasuresRepository } from '../results/summary/repositories/results-innovations-use-measures.repository';
import { ResultsKnowledgeProductsRepository } from '../results/results-knowledge-products/repositories/results-knowledge-products.repository';
import { ResultsKnowledgeProductAltmetricRepository } from '../results/results-knowledge-products/repositories/results-knowledge-product-altmetrics.repository';
import { ResultsKnowledgeProductAuthorRepository } from '../results/results-knowledge-products/repositories/results-knowledge-product-authors.repository';
import { ResultsKnowledgeProductKeywordRepository } from '../results/results-knowledge-products/repositories/results-knowledge-product-keywords.repository';
import { ResultsKnowledgeProductMetadataRepository } from '../results/results-knowledge-products/repositories/results-knowledge-product-metadata.repository';
import { ResultsKnowledgeProductInstitutionRepository } from '../results/results-knowledge-products/repositories/results-knowledge-product-institution.repository';
import {
  ActiveEnum,
  AppModuleIdEnum,
  ModuleTypeEnum,
  StatusPhaseEnum,
} from '../../shared/constants/role-type.enum';
import { DataSource, In } from 'typeorm';
import { UpdateQaResults } from './dto/update-qa.dto';
import { ResultInitiativeBudgetRepository } from '../results/result_budget/repositories/result_initiative_budget.repository';
import { EvidenceSharepointRepository } from '../results/evidences/repositories/evidence-sharepoint.repository';
import { EvidencesService } from '../results/evidences/evidences.service';
import { ShareResultRequestRepository } from '../results/share-result-request/share-result-request.repository';
import { ReturnResponseUtil } from '../../shared/utils/response.util';
import { IpsrRepository } from '../ipsr/ipsr.repository';
import { ResultInnovationPackageRepository } from '../ipsr/result-innovation-package/repositories/result-innovation-package.repository';
import { ResultIpAAOutcomeRepository } from '../ipsr/innovation-pathway/repository/result-ip-action-area-outcome.repository';
import { ResultIpEoiOutcomeRepository } from '../ipsr/innovation-pathway/repository/result-ip-eoi-outcomes.repository';
import { ResultIpImpactAreaRepository } from '../ipsr/innovation-pathway/repository/result-ip-impact-area-targets.repository';
import { ResultIpSdgTargetRepository } from '../ipsr/innovation-pathway/repository/result-ip-sdg-targets.repository';
import { ResultIpExpertWorkshopOrganizedRepostory } from '../ipsr/innovation-pathway/repository/result-ip-expert-workshop-organized.repository';
import { InnovationPackagingExpertRepository } from '../ipsr/innovation-packaging-experts/repositories/innovation-packaging-expert.repository';
import { ResultIpMeasureRepository } from '../ipsr/result-ip-measures/result-ip-measures.repository';
import { ResultIpExpertisesRepository } from '../ipsr/innovation-packaging-experts/repositories/result-ip-expertises.repository';
import { ResultsIpActorRepository } from '../ipsr/results-ip-actors/results-ip-actor.repository';
import { ResultsByIpInnovationUseMeasureRepository } from '../ipsr/results-by-ip-innovation-use-measures/results-by-ip-innovation-use-measure.repository';
import { ResultsIpInstitutionTypeRepository } from '../ipsr/results-ip-institution-type/results-ip-institution-type.repository';
import { ResultActorRepository } from '../results/result-actors/repositories/result-actors.repository';
import { NonPooledProjectBudgetRepository } from '../results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultInstitutionsBudgetRepository } from '../results/result_budget/repositories/result_institutions_budget.repository';
import { ResultCountrySubnationalRepository } from '../results/result-countries-sub-national/repositories/result-country-subnational.repository';
import { ResultAnswerRepository } from '../results/result-questions/repository/result-answers.repository';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import {
  VersioningResponseDto,
  PaginatedVersioningResponseDto,
} from './dto/versioning-response.dto';

@Injectable()
export class VersioningService {
  private readonly _logger: Logger = new Logger(VersioningService.name);

  constructor(
    private readonly _versionRepository: VersionRepository,
    private readonly _resultRepository: ResultRepository,
    private readonly _applicationModulesRepository: ApplicationModulesRepository,
    private readonly _nonPooledProjectRepository: NonPooledProjectRepository,
    private readonly _resultsCenterRepository: ResultsCenterRepository,
    private readonly _resultByInitiativesRepository: ResultByInitiativesRepository,
    private readonly _resultByIntitutionsRepository: ResultByIntitutionsRepository,
    private readonly _resultByInstitutionsByDeliveriesTypeRepository: ResultByInstitutionsByDeliveriesTypeRepository,
    private readonly _resultByIntitutionsTypeRepository: ResultByIntitutionsTypeRepository,
    private readonly _resultCountryRepository: ResultCountryRepository,
    private readonly _resultRegionRepository: ResultRegionRepository,
    private readonly _resultCountrySubnationalRepository: ResultCountrySubnationalRepository,
    private readonly _linkedResultRepository: LinkedResultRepository,
    private readonly _evidencesRepository: EvidencesRepository,
    private readonly _resultsCapacityDevelopmentsRepository: ResultsCapacityDevelopmentsRepository,
    private readonly _resultsImpactAreaIndicatorRepository: ResultsImpactAreaIndicatorRepository,
    private readonly _resultsPolicyChangesRepository: ResultsPolicyChangesRepository,
    private readonly _resultsInnovationsDevRepository: ResultsInnovationsDevRepository,
    private readonly _resultsInnovationsUseRepository: ResultsInnovationsUseRepository,
    private readonly _resultsInnovationsUseMeasuresRepository: ResultsInnovationsUseMeasuresRepository,
    private readonly _resultsKnowledgeProductsRepository: ResultsKnowledgeProductsRepository,
    private readonly _resultsKnowledgeProductAltmetricRepository: ResultsKnowledgeProductAltmetricRepository,
    private readonly _resultsKnowledgeProductAuthorRepository: ResultsKnowledgeProductAuthorRepository,
    private readonly _resultsKnowledgeProductKeywordRepository: ResultsKnowledgeProductKeywordRepository,
    private readonly _resultsKnowledgeProductMetadataRepository: ResultsKnowledgeProductMetadataRepository,
    private readonly _resultsKnowledgeProductInstitutionRepository: ResultsKnowledgeProductInstitutionRepository,
    private readonly _resultInitiativeBudgetRepository: ResultInitiativeBudgetRepository,
    private readonly _resultNonPooledProjectBudgetRepository: NonPooledProjectBudgetRepository,
    private readonly _resultInstitutionsBudgetRepository: ResultInstitutionsBudgetRepository,
    private readonly _evidenceSharepointRepository: EvidenceSharepointRepository,
    private readonly _evidencesService: EvidencesService,
    private readonly _shareResultRequestRepository: ShareResultRequestRepository,
    private readonly _resultActorRepository: ResultActorRepository,
    private readonly _ipsrRespository: IpsrRepository,
    private readonly _resultInnovationPackageRepository: ResultInnovationPackageRepository,
    private readonly _resultIpActionAreaOutcomeRepository: ResultIpAAOutcomeRepository,
    private readonly _resultIpEoiOutcomeRepository: ResultIpEoiOutcomeRepository,
    private readonly _resultIpIaRepository: ResultIpImpactAreaRepository,
    private readonly _resultIpSdgTargetsRepository: ResultIpSdgTargetRepository,
    private readonly _resultIpExpertRepository: InnovationPackagingExpertRepository,
    private readonly _resultIpMeasureRepository: ResultIpMeasureRepository,
    private readonly _resultIpExpertisesRespository: ResultIpExpertisesRepository,
    private readonly _resultIpExpertWorkshopOrganizedRepostory: ResultIpExpertWorkshopOrganizedRepostory,
    private readonly _resultIpResultsActorsRepository: ResultsIpActorRepository,
    private readonly _resultsIpResultMeasuresRespository: ResultsByIpInnovationUseMeasureRepository,
    private readonly _resultsIpInstitutionTypeRepository: ResultsIpInstitutionTypeRepository,
    private readonly _resultAnswerRepository: ResultAnswerRepository,
    private readonly dataSource: DataSource,
    private readonly _clarisaInitiativesRepository: ClarisaInitiativesRepository,
  ) {}

  /**
   *  @important The prefix $_ indicates that this method is for internal
   *  application use only.
   */

  /**
   *  Retrieves the active version from the database.
   *  @important This method should only be used internally.
   *  @returns {Promise<Version>} The active version.
   *  @throws {Error} If an error occurs while retrieving the active version
   *  and return null.
   */
  async $_findActivePhase(module_id: AppModuleIdEnum): Promise<Version> {
    const version = await this._versionRepository.findOne({
      where: {
        status: true,
        is_active: true,
        app_module_id: module_id,
      },
    });

    return version;
  }

  async setQaStatus(data: UpdateQaResults) {
    if (!data?.results_id || !data?.results_id?.length) {
      throw ReturnResponseUtil.format({
        message: `The results_id field is required`,
        response: null,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    const res = this._versionRepository.$_setQaStatusToResult(data.results_id);

    return ReturnResponseUtil.format({
      message: `The results were updated successfully`,
      response: res,
      statusCode: HttpStatus.OK,
    });
  }

  async updateLinkResultQa() {
    const version = await this.$_findActivePhase(AppModuleIdEnum.REPORTING);
    const res = this._versionRepository.$_updateLinkResultByPhase(version.id);

    return ReturnResponseUtil.format({
      message: `The results were updated successfully`,
      response: res,
      statusCode: HttpStatus.OK,
    });
  }

  async $_findPhase(phase_id: number): Promise<Version> {
    if (!phase_id) return null;
    const version = await this._versionRepository.findOne({
      where: {
        id: phase_id,
        is_active: true,
      },
    });

    return version;
  }

  async $_genericValidation(
    result_code: number,
    phase_id: number,
  ): Promise<boolean> {
    try {
      const res = await this._resultRepository.findOne({
        where: {
          version_id: phase_id,
          result_code: result_code,
          is_active: true,
        },
      });
      return res ? false : true;
    } catch (_error) {
      return false;
    }
  }

  async $_phaseChangeReporting(
    result: Result,
    phase: Version,
    user: TokenDto,
    entity_id?: number,
  ) {
    this._logger.log(
      `REPORTING: Phase change in the ${result.id} result to the phase [${phase.id}]:${phase.phase_name} .`,
    );

    const data = await this.dataSource.transaction(async (manager) => {
      const tempData = await this._resultRepository.replicate(
        manager,
        {
          old_result_id: result.id,
          phase: phase.id,
          user: user,
        },
        true,
      );

      let dataResult: Result = null;
      if (tempData?.length) {
        dataResult = tempData[0];
      } else {
        throw ReturnResponseUtil.format({
          message: `The result ${result.id} could not be replicated`,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          response: null,
        });
      }

      const config = {
        old_result_id: result.id,
        new_result_id: dataResult.id,
        phase: phase.id,
        user: user,
        entity_id: entity_id,
      };
      await this._resultByInitiativesRepository.replicate(manager, config);

      if (!entity_id) {
        await this._shareResultRequestRepository.replicate(manager, config);
        await this._resultInitiativeBudgetRepository.replicate(manager, config);
        await this._resultNonPooledProjectBudgetRepository.replicate(
          manager,
          config,
        );
      }

      switch (parseInt(`${result.result_type_id}`)) {
        case 1:
          await this._resultsPolicyChangesRepository.replicate(manager, config);
          break;
        case 2:
          await this._resultsInnovationsUseRepository.replicate(
            manager,
            config,
          );
          await this._resultsInnovationsUseMeasuresRepository.replicate(
            manager,
            config,
          );
          break;
        case 5:
          await this._resultsCapacityDevelopmentsRepository.replicate(
            manager,
            config,
          );
          break;
        case 6:
          await this._resultsKnowledgeProductsRepository.replicate(
            manager,
            config,
          );
          await this._resultsKnowledgeProductAltmetricRepository.replicate(
            manager,
            config,
          );
          await this._resultsKnowledgeProductAuthorRepository.replicate(
            manager,
            config,
          );
          await this._resultsKnowledgeProductKeywordRepository.replicate(
            manager,
            config,
          );
          await this._resultsKnowledgeProductMetadataRepository.replicate(
            manager,
            config,
          );
          await this._resultsKnowledgeProductInstitutionRepository.replicate(
            manager,
            config,
          );
          break;
        case 7:
          await this._resultsInnovationsDevRepository.replicate(
            manager,
            config,
          );
          await this._resultAnswerRepository.replicate(manager, config);
          await this._resultActorRepository.replicate(manager, config);
          await this._resultIpMeasureRepository.replicate(manager, config);
          break;
      }
      await this._nonPooledProjectRepository.replicate(manager, config);
      await this._resultsCenterRepository.replicate(manager, config);
      await this._resultByIntitutionsRepository.replicate(manager, config);
      await this._resultByInstitutionsByDeliveriesTypeRepository.replicate(
        manager,
        config,
      );
      await this._resultByIntitutionsTypeRepository.replicate(manager, config);

      if (!entity_id) {
        await this._resultInstitutionsBudgetRepository.replicate(
          manager,
          config,
        );
      }

      await this._resultCountryRepository.replicate(manager, config);
      await this._resultRegionRepository.replicate(manager, config);
      await this._linkedResultRepository.replicate(manager, config);
      await this._evidencesRepository.replicate(manager, config);
      await this._evidenceSharepointRepository.replicate(manager, config);
      await this._evidencesService.replicateSPFiles(config);

      return dataResult;
    });

    //await this._resultsImpactAreaIndicatorRepository.replicable(config);

    this._logger.log(
      `REPORTING: The change of phase of result ${result.id} is completed correctly.`,
    );
    this._logger.log(
      `REPORTING: New result reference in phase [${phase.id}]:${phase.phase_name} is ${data.id}`,
    );
    return data;
  }

  async $_phaseChangeIPSR(
    result: Result,
    phase: Version,
    user: TokenDto,
    entity_id?: number,
  ) {
    this._logger.log(
      `IPSR: Phase change in the ${result.id} result to the phase [${phase.id}]:${phase.phase_name} .`,
    );

    let tempData: Result[] = null;
    const data = await this.dataSource.transaction(async (manager) => {
      tempData = await this._resultRepository.replicate(
        manager,
        {
          old_result_id: result.id,
          phase: phase.id,
          user: user,
        },
        true,
      );

      let dataResult: Result = null;
      if (tempData?.length) {
        dataResult = tempData[0];
      } else {
        throw ReturnResponseUtil.format({
          message: `The result ${result.id} could not be replicated`,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          response: null,
        });
      }

      const config = {
        old_result_id: result.id,
        new_result_id: dataResult.id,
        phase: phase.id,
        user: user,
        new_ipsr_id: null,
        old_ipsr_id: null,
        entity_id: entity_id,
      };

      const portfolioP25 = await this._versionRepository.findOne({
        select: {
          id: true,
          portfolio_id: true,
          obj_portfolio: {
            id: true,
            acronym: true,
          },
        },
        where: {
          id: Number(phase.id),
          status: true,
          app_module_id: AppModuleIdEnum.IPSR,
        },
      });

      // RESULT
      await this._resultByInitiativesRepository.replicate(manager, config);
      if (!portfolioP25) {
        await this._shareResultRequestRepository.replicate(manager, config);
      }
      await this._nonPooledProjectRepository.replicate(manager, config);
      await this._resultsCenterRepository.replicate(manager, config);
      await this._resultByIntitutionsRepository.replicate(manager, config);
      await this._resultByInstitutionsByDeliveriesTypeRepository.replicate(
        manager,
        config,
      );
      await this._resultByIntitutionsTypeRepository.replicate(manager, config);
      await this._resultCountryRepository.replicate(manager, config);
      await this._resultRegionRepository.replicate(manager, config);
      await this._resultCountrySubnationalRepository.replicate(manager, config);
      await this._linkedResultRepository.replicate(manager, config);
      await this._evidencesRepository.replicate(manager, config);
      await this._resultActorRepository.replicate(manager, config);
      if (!config?.entity_id) {
        await this._resultInitiativeBudgetRepository.replicate(manager, config);
        await this._resultNonPooledProjectBudgetRepository.replicate(
          manager,
          config,
        );
        await this._resultInstitutionsBudgetRepository.replicate(
          manager,
          config,
        );
      }

      // IPSR
      await this._resultInnovationPackageRepository.replicate(manager, config);
      const tempDataIP = await this._ipsrRespository.replicate(manager, config);
      config.new_ipsr_id = tempDataIP[0].result_by_innovation_package_id;
      const rbip = await this._ipsrRespository.find({
        select: ['result_by_innovation_package_id'],
        where: {
          result_innovation_package_id: result.id,
          ipsr_role_id: 1,
          is_active: true,
        },
      });
      config.old_ipsr_id = rbip[0].result_by_innovation_package_id;

      await this._resultIpActionAreaOutcomeRepository.replicate(
        manager,
        config,
      );
      await this._resultIpEoiOutcomeRepository.replicate(manager, config);
      await this._resultIpIaRepository.replicate(manager, config);
      await this._resultIpSdgTargetsRepository.replicate(manager, config);
      await this._resultIpExpertRepository.replicate(manager, config);
      await this._resultIpMeasureRepository.replicate(manager, config);
      await this._resultIpExpertisesRespository.replicate(manager, config);
      await this._resultIpExpertWorkshopOrganizedRepostory.replicate(
        manager,
        config,
      );
      await this._resultIpResultsActorsRepository.replicate(manager, config);
      await this._resultsIpResultMeasuresRespository.replicate(manager, config);
      await this._resultsIpInstitutionTypeRepository.replicate(manager, config);

      return dataResult;
    });

    this._logger.log(
      `IPSR: The change of phase of result ${tempData[0].result_code} is completed correctly.`,
    );
    this._logger.log(
      `IPSR: New result reference in phase [${phase.id}]:${phase.phase_name} is ${data.id}`,
    );
    return data;
  }

  async $_versionManagement(
    result: Result,
    phase: Version,
    user: TokenDto,
    module_id: number,
    entity_id?: number,
  ) {
    switch (module_id) {
      case 1:
        return await this.$_phaseChangeReporting(
          result,
          phase,
          user,
          entity_id,
        );
        break;
      case 2:
        return await this.$_phaseChangeIPSR(result, phase, user, entity_id);
        break;
      default:
        break;
    }
  }

  $_validationModule(result_type_id: number) {
    if ([1, 2, 3, 4, 5, 6, 7, 8, 9].includes(result_type_id)) return 1;
    if ([10, 11].includes(result_type_id)) return 2;
    return null;
  }

  async versionProcess(result_id: number, user: TokenDto) {
    const legacy_result = await this._resultRepository.findOne({
      where: {
        id: result_id,
        is_active: true,
      },
    });

    if (!legacy_result) {
      throw ReturnResponseUtil.format({
        message: `Result ID: ${result_id} not found`,
        response: result_id,
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    if (legacy_result.result_type_id == 6) {
      throw ReturnResponseUtil.format({
        message: `Result ID: ${result_id} is a Knowledge Product, this type of result is not possible to phase shift it contact support`,
        response: result_id,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const module_id = this.$_validationModule(legacy_result.result_type_id);

    const phase = await this._versionRepository.findOne({
      where: {
        app_module_id: module_id,
        is_active: true,
        status: true,
      },
    });

    if (!phase) {
      throw ReturnResponseUtil.format({
        message: `No active phases`,
        response: null,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    let res: any = null;
    if (await this.$_genericValidation(legacy_result.result_code, phase.id)) {
      res = await this.$_versionManagement(
        legacy_result,
        phase,
        user,
        module_id,
      );
      if (res?.error) {
        throw ReturnResponseUtil.format({
          message: `Error in the version process of the result ${legacy_result.id}. Contact with support `,
          response: res.error,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      return ReturnResponseUtil.format({
        message: `The result ${legacy_result.result_code} is in the ${phase.phase_name} phase with id ${res.id}`,
        response: res,
        statusCode: HttpStatus.OK,
      });
    } else {
      throw ReturnResponseUtil.format({
        message: `The result ${legacy_result.result_code} is already in the ${phase.phase_name} phase`,
        response: result_id,
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }

  async versionProcessV2(result_id: number, entity_id: number, user: TokenDto) {
    const entity = await this._clarisaInitiativesRepository.findOne({
      where: { id: entity_id, active: true },
    });

    if (!entity || entity.portfolio_id !== 3) {
      throw ReturnResponseUtil.format({
        message: `Replication is only allowed for entities with portfolio_id = 3`,
        response: entity_id,
        statusCode: HttpStatus.FORBIDDEN,
      });
    }

    const legacy_result: Result = await this._resultRepository.findOne({
      where: {
        id: result_id,
        is_active: true,
      },
      relations: {
        obj_result_by_initiatives: true,
      },
    });

    if (!legacy_result) {
      throw ReturnResponseUtil.format({
        message: `Result ID: ${result_id} not found`,
        response: result_id,
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const mainInitiative = legacy_result.obj_result_by_initiatives?.find(
      (rbi) => +rbi.initiative_role_id === 1,
    );

    if (!mainInitiative) {
      throw ReturnResponseUtil.format({
        message: `No main initiative (role 1) found for this result`,
        response: result_id,
        statusCode: HttpStatus.FORBIDDEN,
      });
    }

    const initiativeEntityMap = await this.dataSource
      .getRepository('initiative_entity_map')
      .findOne({
        where: {
          initiativeId: mainInitiative.initiative_id,
          entityId: entity_id,
        },
      });

    if (!initiativeEntityMap) {
      throw ReturnResponseUtil.format({
        message: `The entity ${entity_id} is not related to initiative ${mainInitiative.initiative_id}`,
        response: { entity_id, initiative_id: mainInitiative.initiative_id },
        statusCode: HttpStatus.FORBIDDEN,
      });
    }

    if (legacy_result.result_type_id == 6) {
      throw ReturnResponseUtil.format({
        message: `Result ID: ${result_id} is a Knowledge Product, this type of result is not possible to phase shift it contact support`,
        response: result_id,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const module_id = this.$_validationModule(legacy_result.result_type_id);

    const phase = await this._versionRepository.findOne({
      where: {
        app_module_id: module_id,
        is_active: true,
        status: true,
      },
    });

    if (!phase) {
      throw ReturnResponseUtil.format({
        message: `No active phases`,
        response: null,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    let res: any = null;
    if (await this.$_genericValidation(legacy_result.result_code, phase.id)) {
      res = await this.$_versionManagement(
        legacy_result,
        phase,
        user,
        module_id,
        entity_id,
      );
      if (res?.error) {
        throw ReturnResponseUtil.format({
          message: `Error in the version process of the result ${legacy_result.id}. Contact with support `,
          response: res.error,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }

      return ReturnResponseUtil.format({
        message: `The result ${legacy_result.result_code} is in the ${phase.phase_name} phase with id ${res.id}`,
        response: res,
        statusCode: HttpStatus.OK,
      });
    } else {
      throw ReturnResponseUtil.format({
        message: `The result ${legacy_result.result_code} is already in the ${phase.phase_name} phase`,
        response: result_id,
        statusCode: HttpStatus.CONFLICT,
      });
    }
  }

  async getNumberRresultsReplicated(status: number, result_type_id: number) {
    const phase = await this._versionRepository.findOne({
      where: {
        is_active: true,
        status: true,
        app_module_id:
          this.$_validationModule(result_type_id) == 1
            ? AppModuleIdEnum.REPORTING
            : AppModuleIdEnum.IPSR,
      },
      relations: {
        obj_previous_phase: true,
      },
    });

    let countResults: Result[] = null;
    if (this.$_validationModule(result_type_id) == 1) {
      countResults =
        await this._versionRepository.$_getAllInovationDevToReplicate(
          phase,
          result_type_id,
        );
    } else {
      countResults =
        await this._versionRepository.$_getAllInovationPackageToReplicate(
          phase,
          result_type_id,
        );
    }

    const names = await this._versionRepository.getDataStatusAndTypeResult(
      status,
      result_type_id,
    );

    return ReturnResponseUtil.format({
      message: `The number of results replicated is ${countResults?.length}`,
      response: {
        count: countResults.length,
        status_name: names.status,
        result_type_name: names.type,
      },
      statusCode: HttpStatus.OK,
    });
  }

  async annualReplicationProcessInnovationDev(user: TokenDto) {
    const phase = await this._versionRepository.findOne({
      where: {
        is_active: true,
        status: true,
        app_module_id: AppModuleIdEnum.REPORTING,
      },
      relations: {
        obj_previous_phase: true,
      },
    });

    if (!phase) {
      throw ReturnResponseUtil.format({
        message: `There is no active phase`,
        response: null,
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const results =
      await this._versionRepository.$_getAllInovationDevToReplicate(phase);

    for (const r of results) {
      if (this.$_genericValidation(r.result_code, phase.id)) {
        await this.$_phaseChangeReporting(r, phase, user);
      }
    }

    return ReturnResponseUtil.format({
      message: `The results were replicated successfully`,
      response: results?.length,
      statusCode: HttpStatus.OK,
    });
  }

  async annualReplicationProcessInnovationPackage(user: TokenDto) {
    try {
      const phase = await this._versionRepository.findOne({
        where: {
          is_active: true,
          status: true,
          app_module_id: AppModuleIdEnum.IPSR,
        },
        relations: {
          obj_previous_phase: true,
        },
      });

      if (!phase) {
        throw ReturnResponseUtil.format({
          message: `There is no active phase`,
          response: null,
          statusCode: HttpStatus.NOT_FOUND,
        });
      }

      const results =
        await this._versionRepository.$_getAllInovationPackageToReplicate(
          phase,
        );

      for (const r of results) {
        const isValid = await this.$_genericValidation(r.result_code, phase.id);
        if (isValid) {
          await this.$_phaseChangeIPSR(r, phase, user);
        }
      }

      return ReturnResponseUtil.format({
        message: `The results were replicated successfully`,
        response: results?.length,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return ReturnResponseUtil.format(error);
    }
  }

  async findAppModules(): Promise<ReturnResponseDto<ApplicationModules[]>> {
    try {
      const res = await this._applicationModulesRepository.find({
        where: {
          is_active: true,
        },
      });
      return ReturnResponseUtil.format({
        message: `Application Modules Retrieved Successfully`,
        response: res,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      return ReturnResponseUtil.format(error);
    }
  }

  async create(
    user: TokenDto,
    createVersioningDto: CreateVersioningDto,
  ): Promise<ReturnResponseDto<Version>> {
    const res = await this._versionRepository.findOne({
      where: {
        phase_year: createVersioningDto?.phase_year,
        app_module_id: createVersioningDto.app_module_id,
        is_active: true,
      },
    });

    if (res) {
      throw ReturnResponseUtil.format({
        message: `A phase has already been created for the module ${createVersioningDto?.app_module_id} in the selected year ${createVersioningDto?.phase_year}.`,
        response: createVersioningDto,
        statusCode: HttpStatus.CONFLICT,
      });
    }

    const newPhase = await this._versionRepository.save({
      phase_name: createVersioningDto?.phase_name,
      start_date: createVersioningDto?.start_date,
      end_date: createVersioningDto?.end_date,
      phase_year: createVersioningDto?.phase_year,
      cgspace_year: createVersioningDto?.phase_year,
      toc_pahse_id: createVersioningDto?.toc_pahse_id,
      previous_phase: createVersioningDto?.previous_phase,
      app_module_id: createVersioningDto.app_module_id,
      created_by: user.id,
      reporting_phase: createVersioningDto?.reporting_phase,
      portfolio_id: createVersioningDto?.portfolio_id,
    });

    return ReturnResponseUtil.format({
      message: `Phase ${newPhase.phase_name} created successfully`,
      response: newPhase,
      statusCode: HttpStatus.CREATED,
    });
  }

  async update(
    id: number,
    updateVersioningDto: UpdateVersioningDto,
  ): Promise<ReturnResponseDto<Version>> {
    const res = await this._versionRepository.findOne({
      where: {
        id: id,
        is_active: true,
      },
    });

    if (!res) {
      throw ReturnResponseUtil.format({
        message: `Phase ID: ${id} not found`,
        response: id,
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    if (updateVersioningDto?.status) {
      if (!res?.app_module_id) {
        throw ReturnResponseUtil.format({
          message: `The phase ${res.phase_name} does not have a module associated to it. Contact with support`,
          response: res,
          statusCode: HttpStatus.CONFLICT,
        });
      }
      await this._versionRepository.$_closeAllPhases(res.app_module_id);
    }
    await this._versionRepository.update(id, {
      status: updateVersioningDto.status,
      previous_phase: updateVersioningDto.previous_phase,
      phase_name: updateVersioningDto.phase_name,
      portfolio_id: updateVersioningDto.portfolio_id,
    });

    return ReturnResponseUtil.format({
      message: `Phase ${res.phase_name} updated successfully`,
      response: { ...res, ...updateVersioningDto },
      statusCode: HttpStatus.OK,
    });
  }

  /**
   * Find phases by module, status and active with pagination.
   * 
   * @important Lambda Response Size Constraint:
   * AWS Lambda has a maximum response payload size of ~6MB. This method implements:
   * - Pagination (default: page=1, limit=50, max=100)
   * - Response size monitoring and logging
   * - Optimized queries to prevent N+1 problems
   * - DTO projection to limit returned fields
   * 
   * If response size approaches/exceeds limits, pagination is enforced and errors are returned
   * with proper HTTP status codes (400 for invalid params, 413-like behavior for oversized).
   * 
   * @param module_type - Module type filter (reporting, ipsr, all)
   * @param status - Status filter (open, close, all)
   * @param active - Active filter (active, inactive, all)
   * @param page - Page number (1-indexed, default: 1)
   * @param limit - Items per page (default: 50, max: 100)
   * @returns Paginated response with metadata
   */
  async find(
    module_type: ModuleTypeEnum,
    status: StatusPhaseEnum,
    active: ActiveEnum = ActiveEnum.ACTIVE,
    page: number = 1,
    limit: number = 50,
  ): Promise<ReturnResponseDto<PaginatedVersioningResponseDto>> {
    // Log request parameters for diagnostics
    this._logger.log(
      `[VERSIONING-FIND] Request params: module=${module_type}, status=${status}, active=${active}, page=${page}, limit=${limit}`,
    );

    // Validate pagination parameters
    const validatedPage = Math.max(1, Math.floor(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, Math.floor(limit) || 50));

    if (page !== validatedPage || limit !== validatedLimit) {
      this._logger.warn(
        `[VERSIONING-FIND] Pagination params adjusted: page ${page}->${validatedPage}, limit ${limit}->${validatedLimit}`,
      );
    }

    // Build where clause
    let where: any = {};

    switch (module_type) {
      case ModuleTypeEnum.REPORTING:
        where = { ...where, app_module_id: 1 };
        break;
      case ModuleTypeEnum.IPSR:
        where = { ...where, app_module_id: 2 };
        break;
    }

    switch (active) {
      case ActiveEnum.ACTIVE:
        where = { ...where, is_active: true };
        break;
      case ActiveEnum.INACTIVE:
        where = { ...where, is_active: false };
        break;
    }

    switch (status) {
      case StatusPhaseEnum.OPEN:
        where = { ...where, status: true };
        break;
      case StatusPhaseEnum.CLOSE:
        where = { ...where, status: false };
        break;
    }

    try {
      // Get total count for pagination metadata
      const total = await this._versionRepository.count({ where });

      // Calculate pagination
      const skip = (validatedPage - 1) * validatedLimit;
      const totalPages = Math.ceil(total / validatedLimit);
      const hasNext = validatedPage < totalPages;

      // Fetch paginated results with relations
      // Note: TypeORM doesn't support partial relation selection easily,
      // but we'll map to DTO to limit payload size
      const res = await this._versionRepository.find({
        where: where,
        relations: {
          obj_previous_phase: true,
          obj_reporting_phase: true,
          obj_portfolio: true,
        },
        skip: skip,
        take: validatedLimit,
        order: {
          phase_year: 'DESC',
          id: 'DESC',
        },
      });

      // Optimize N+1 queries: Batch fetch all can_be_deleted checks in 2 queries
      const versionIds = res.map((v) => v.id);
      
      // Guard against empty IN () clause which causes SQL syntax errors
      // If no versions found, skip queries and use empty sets
      // This prevents: "You have an error in your SQL syntax... near ') AND `r`.`is_active` = true'"
      let versionsWithResultsSet = new Set<number>();
      let versionsAsPreviousPhaseSet = new Set<number>();
      
      if (versionIds.length > 0) {
        this._logger.debug(
          `[VERSIONING-FIND] Checking can_be_deleted for ${versionIds.length} versions`,
        );
        // Check which versions have results (batch query)
        const versionsWithResults = await this._resultRepository
          .createQueryBuilder('r')
          .select('DISTINCT r.version_id', 'version_id')
          .where('r.version_id IN (:...ids)', { ids: versionIds })
          .andWhere('r.is_active = :active', { active: true })
          .getRawMany();
        
        versionsWithResultsSet = new Set(
          versionsWithResults.map((v: any) => v.version_id),
        );

        // Check which versions are referenced as previous_phase (batch query)
        const versionsAsPreviousPhase = await this._versionRepository
          .createQueryBuilder('v')
          .select('DISTINCT v.previous_phase', 'previous_phase')
          .where('v.previous_phase IN (:...ids)', { ids: versionIds })
          .andWhere('v.is_active = :active', { active: true })
          .getRawMany();
        
        versionsAsPreviousPhaseSet = new Set(
          versionsAsPreviousPhase.map((v: any) => v.previous_phase),
        );
      }

      // Map to DTO and calculate can_be_deleted
      const items: VersioningResponseDto[] = res.map((version) => {
        const hasResults = versionsWithResultsSet.has(version.id);
        const isPreviousPhase = versionsAsPreviousPhaseSet.has(version.id);
        const can_be_deleted = !hasResults && !isPreviousPhase;

        return {
          id: version.id,
          phase_name: version.phase_name,
          start_date: version.start_date,
          end_date: version.end_date,
          phase_year: version.phase_year,
          status: version.status,
          previous_phase: version.previous_phase,
          app_module_id: version.app_module_id,
          reporting_phase: version.reporting_phase,
          portfolio_id: version.portfolio_id,
          previous_phase_name: version.obj_previous_phase?.phase_name || null,
          reporting_phase_name: version.obj_reporting_phase?.phase_name || null,
          portfolio_acronym: version.obj_portfolio?.acronym || null,
          can_be_deleted,
        };
      });

      // Build paginated response
      const paginatedResponse: PaginatedVersioningResponseDto = {
        items,
        page: validatedPage,
        limit: validatedLimit,
        total,
        hasNext,
        totalPages,
      };

      // Calculate and log response size BEFORE returning
      const responseJson = JSON.stringify(paginatedResponse);
      const responseSizeBytes = Buffer.byteLength(responseJson, 'utf8');
      const responseSizeMB = responseSizeBytes / (1024 * 1024);
      const LAMBDA_MAX_PAYLOAD_BYTES = 6 * 1024 * 1024; // 6MB
      const WARNING_THRESHOLD_BYTES = 5 * 1024 * 1024; // 5MB warning threshold

      this._logger.log(
        `[VERSIONING-FIND] Response size: ${responseSizeBytes} bytes (${responseSizeMB.toFixed(2)} MB), Records: ${items.length}, Total: ${total}`,
      );

      // Check if response is approaching or exceeding limits
      if (responseSizeBytes > LAMBDA_MAX_PAYLOAD_BYTES) {
        this._logger.error(
          `[VERSIONING-FIND] Response size ${responseSizeBytes} bytes exceeds Lambda limit of ${LAMBDA_MAX_PAYLOAD_BYTES} bytes`,
        );
        throw ReturnResponseUtil.format({
          message: `Response payload too large (${responseSizeMB.toFixed(2)} MB). Please use pagination with smaller page size.`,
          response: null,
          statusCode: 413, // PAYLOAD_TOO_LARGE - Response exceeds Lambda's 6MB limit
        });
      }

      if (responseSizeBytes > WARNING_THRESHOLD_BYTES) {
        this._logger.warn(
          `[VERSIONING-FIND] Response size ${responseSizeBytes} bytes is approaching Lambda limit. Consider reducing page size.`,
        );
      }

      return ReturnResponseUtil.format({
        message: `Phase Retrieved Successfully`,
        response: paginatedResponse,
        statusCode: HttpStatus.OK,
      });
    } catch (error) {
      // If it's already a formatted error, re-throw it
      if (error?.statusCode) {
        throw error;
      }

      // Log unexpected errors
      this._logger.error(
        `[VERSIONING-FIND] Unexpected error: ${error?.message || error}`,
        error?.stack,
      );

      // Return proper error response
      throw ReturnResponseUtil.format({
        message: `Error retrieving phases: ${error?.message || 'Unknown error'}`,
        response: null,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async delete(id: number) {
    const res = await this._versionRepository.findOne({
      where: {
        id: id,
        is_active: true,
      },
    });
    if (!res) {
      throw ReturnResponseUtil.format({
        message: `Phase ID: ${id} not found`,
        response: id,
        statusCode: HttpStatus.NOT_FOUND,
      });
    }

    const results = await this._resultRepository.find({
      where: {
        version_id: id,
        is_active: true,
      },
    });
    if (results?.length) {
      throw ReturnResponseUtil.format({
        message: `The phase has active results therefore cannot be eliminated`,
        response: results.length,
        statusCode: HttpStatus.CONFLICT,
      });
    }
    await this._versionRepository.update(res.id, { is_active: false });
    return ReturnResponseUtil.format({
      message: `Phase ${res.phase_name} deleted successfully`,
      response: { ...res, is_active: false },
      statusCode: HttpStatus.OK,
    });
  }

  async getAllPhases() {
    const res = await this._versionRepository.find({
      relations: {
        obj_app_module: true,
        obj_portfolio: true,
      },
    });

    return ReturnResponseUtil.format({
      message: `Phase Retrieved Successfully`,
      response: res,
      statusCode: HttpStatus.OK,
    });
  }

  async getVersionOfAResult(resul_id: number) {
    const versions_id =
      await this._versionRepository.$_getVersionOfAResult(resul_id);
    const res = await this._versionRepository.find({
      where: {
        id: In(versions_id),
      },
    });

    return ReturnResponseUtil.format({
      message: `Phase Retrieved Successfully`,
      response: res,
      statusCode: HttpStatus.OK,
    });
  }
}
