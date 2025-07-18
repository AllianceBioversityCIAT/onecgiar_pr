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

  async $_phaseChangeReporting(result: Result, phase: Version, user: TokenDto) {
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
      };
      await this._resultByInitiativesRepository.replicate(manager, config);
      await this._shareResultRequestRepository.replicate(manager, config);

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
      await this._resultInstitutionsBudgetRepository.replicate(manager, config);
      await this._resultInitiativeBudgetRepository.replicate(manager, config);
      await this._resultNonPooledProjectBudgetRepository.replicate(
        manager,
        config,
      );
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

  async $_phaseChangeIPSR(result: Result, phase: Version, user: TokenDto) {
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
      };

      // RESULT
      await this._resultByInitiativesRepository.replicate(manager, config);
      await this._shareResultRequestRepository.replicate(manager, config);
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
      await this._resultInitiativeBudgetRepository.replicate(manager, config);
      await this._resultNonPooledProjectBudgetRepository.replicate(
        manager,
        config,
      );
      await this._resultInstitutionsBudgetRepository.replicate(manager, config);

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
  ) {
    switch (module_id) {
      case 1:
        return await this.$_phaseChangeReporting(result, phase, user);
        break;
      case 2:
        return await this.$_phaseChangeIPSR(result, phase, user);
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

  async find(
    module_type: ModuleTypeEnum,
    status: StatusPhaseEnum,
    active: ActiveEnum = ActiveEnum.ACTIVE,
  ) {
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

    const res = await this._versionRepository.find({
      where: where,
      relations: {
        obj_previous_phase: true,
        obj_reporting_phase: true,
        obj_portfolio: true,
      },
    });

    for (const key in res) {
      const otherPhase = await this._resultRepository.findOne({
        where: {
          version_id: res[key].id,
          is_active: true,
        },
      });

      const otherPreviousPhase = await this._versionRepository.findOne({
        where: {
          previous_phase: res[key].id,
          is_active: true,
        },
      });
      res[key]['can_be_deleted'] = !otherPreviousPhase && !otherPhase;
    }

    return ReturnResponseUtil.format({
      message: `Phase Retrieved Successfully`,
      response: res,
      statusCode: HttpStatus.OK,
    });
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
