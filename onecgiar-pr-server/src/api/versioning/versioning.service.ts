import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { CreateVersioningDto } from './dto/create-versioning.dto';
import { UpdateVersioningDto } from './dto/update-versioning.dto';
import { Version } from './entities/version.entity';
import { VersionRepository } from './versioning.repository';
import { Result, SourceEnum } from '../results/entities/result.entity';
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
import { DataSource, EntityManager, In } from 'typeorm';
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
import { Ipsr } from '../ipsr/entities/ipsr.entity';
import { ResultRegion } from '../results/result-regions/entities/result-region.entity';
import { ResultCountry } from '../results/result-countries/entities/result-country.entity';
import {
  GEO_SCOPE_REGIONAL,
  GEO_SCOPE_WITH_COUNTRIES,
  buildInnovationPackageTitle,
} from '../ipsr/utils/innovation-package-title.util';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { BilateralVersioningRulesService } from '../bilateral/versioning-rules/bilateral-versioning-rules.service';

/** Clarisa `clarisa_initiatives.portfolio_id` for CGIAR Programs (P25). */
const PORTFOLIO_CGIAR_PROGRAMS_P25_ID = 3;

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
    private readonly _roleByUserRepository: RoleByUserRepository,
    private readonly _bilateralRules: BilateralVersioningRulesService,
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

  /**
   * P2-3420 / P2-3421 — the reporting phase immediately BEFORE the open one, as a year.
   *
   * Derived from `version.previous_phase`, never from a hardcoded year: Ángel Jarrín's scope note of
   * 31-Aug-2026 asks for the rule to "remain generic and always refer to the previous reporting
   * phase". Falls back to `openYear - 1` only when the open phase carries no `previous_phase` link,
   * so a missing link degrades to the obvious answer instead of returning nothing.
   *
   * Deliberately a NEW method: `$_findActivePhase` is consumed all over the server and loading an
   * extra relation there would change what every one of those callers receives.
   */
  async $_findPreviousPhaseYear(
    module_id: AppModuleIdEnum,
  ): Promise<number | null> {
    const openPhase = await this._versionRepository.findOne({
      where: {
        status: true,
        is_active: true,
        app_module_id: module_id,
      },
    });

    if (!openPhase) return null;

    const openYear = Number(openPhase.phase_year) || null;

    if (openPhase.previous_phase) {
      const previous = await this._versionRepository.findOne({
        where: { id: openPhase.previous_phase },
      });
      const previousYear = Number(previous?.phase_year);
      if (previousYear) return previousYear;
    }

    return openYear ? openYear - 1 : null;
  }

  async setQaStatus(data: UpdateQaResults) {
    if (!data?.results_id?.length) {
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
      return !res;
    } catch (error: unknown) {
      let detail = 'Unexpected error';
      if (error instanceof Error) {
        detail = error.message;
      } else if (typeof error === 'string') {
        detail = error;
      }
      this._logger.warn(
        `$_genericValidation failed (result_code=${result_code}, phase_id=${phase_id}): ${detail}`,
      );
      return false;
    }
  }

  async $_phaseChangeReporting(
    result: Result,
    phase: Version,
    user: TokenDto,
    entity_id?: number,
    same_portfolio_phase_change?: boolean,
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

      // Preserve original result_code so the new phase keeps the same reference (trigger may have assigned a new one).
      await manager.update(
        Result,
        { id: dataResult.id },
        { result_code: result.result_code },
      );
      dataResult.result_code = result.result_code;

      const isV2CrossPortfolio =
        entity_id != null && same_portfolio_phase_change !== true;

      const config = {
        old_result_id: result.id,
        new_result_id: dataResult.id,
        phase: phase.id,
        user: user,
        entity_id: entity_id,
        same_portfolio_phase_change: same_portfolio_phase_change,
      };
      await this._resultByInitiativesRepository.replicate(manager, config);

      if (!isV2CrossPortfolio) {
        await this._shareResultRequestRepository.replicate(manager, config);
        await this._resultInitiativeBudgetRepository.replicate(manager, config);
        await this._resultNonPooledProjectBudgetRepository.replicate(
          manager,
          config,
        );
      }

      switch (Number.parseInt(`${result.result_type_id}`, 10)) {
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

      if (!isV2CrossPortfolio) {
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

      await this._resultInitiativeBudgetRepository.ensureMissingBudgetsForPrimaryInitiatives(
        manager,
        dataResult.id,
        user,
      );

      return dataResult;
    });

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
    same_portfolio_phase_change?: boolean,
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

      // Preserve original result_code so the new phase keeps the same reference (trigger may have assigned a new one).
      await manager.update(
        Result,
        { id: dataResult.id },
        { result_code: result.result_code },
      );
      dataResult.result_code = result.result_code;

      const config = {
        old_result_id: result.id,
        new_result_id: dataResult.id,
        phase: phase.id,
        user: user,
        new_ipsr_id: null,
        old_ipsr_id: null,
        entity_id: entity_id,
        same_portfolio_phase_change: same_portfolio_phase_change,
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
      const shouldReplicateShareRequests =
        (!config.entity_id && !portfolioP25) ||
        (!!config.entity_id && config.same_portfolio_phase_change === true);
      if (shouldReplicateShareRequests) {
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
      const shouldReplicateFullBudgets =
        !config.entity_id || config.same_portfolio_phase_change === true;
      if (shouldReplicateFullBudgets) {
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
        select: ['result_by_innovation_package_id', 'result_id'],
        where: {
          result_innovation_package_id: result.id,
          ipsr_role_id: 1,
          is_active: true,
        },
      });
      config.old_ipsr_id = rbip[0].result_by_innovation_package_id;

      await this.$_refreshIpsrTitleFromCoreInnovation(
        manager,
        dataResult,
        rbip[0].result_id,
        user,
      );

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

      await this._resultInitiativeBudgetRepository.ensureMissingBudgetsForPrimaryInitiatives(
        manager,
        dataResult.id,
        user,
      );

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

  /**
   * The Innovation Package title embeds the title of its core innovation. When
   * replication re-points the core innovation link to a newer version (see
   * `IpsrRepository.createQueries`), the inherited title would keep naming the
   * previous version of the innovation, which is what users report as "the
   * package title did not update".
   *
   * The title is only rebuilt when the link actually moved, so a title edited
   * by hand through the general information section is preserved whenever the
   * core innovation stayed the same.
   */
  private async $_refreshIpsrTitleFromCoreInnovation(
    manager: EntityManager,
    newResult: Result,
    previousCoreInnovationId: number,
    user: TokenDto,
  ): Promise<void> {
    const newCoreLink = await manager.getRepository(Ipsr).findOne({
      select: { result_id: true },
      where: {
        result_innovation_package_id: newResult.id,
        ipsr_role_id: 1,
        is_active: true,
      },
    });

    if (
      !newCoreLink?.result_id ||
      Number(newCoreLink.result_id) === Number(previousCoreInnovationId)
    ) {
      return;
    }

    const coreInnovation = await manager.getRepository(Result).findOne({
      select: { id: true, title: true },
      where: { id: newCoreLink.result_id },
    });

    if (!coreInnovation?.title) return;

    const geoScopeId = Number(newResult.geographic_scope_id);

    const regionNames =
      geoScopeId === GEO_SCOPE_REGIONAL
        ? (
            await manager.getRepository(ResultRegion).find({
              where: { result_id: newResult.id, is_active: true },
              relations: { region_object: true },
              order: { result_region_id: 'ASC' },
            })
          )
            .map((region) => region.region_object?.name)
            .filter((name): name is string => !!name)
        : [];

    const countryNames = GEO_SCOPE_WITH_COUNTRIES.includes(geoScopeId)
      ? (
          await manager.getRepository(ResultCountry).find({
            where: { result_id: newResult.id, is_active: true },
            relations: { country_object: true },
            order: { result_country_id: 'ASC' },
          })
        )
          .map((country) => country.country_object?.name)
          .filter((name): name is string => !!name)
      : [];

    const title = buildInnovationPackageTitle({
      coreInnovationTitle: coreInnovation.title,
      geoScopeId,
      regionNames,
      countryNames,
    });

    if (title === newResult.title) return;

    await manager.update(
      Result,
      { id: newResult.id },
      { title, last_updated_by: user.id },
    );
    newResult.title = title;

    this._logger.log(
      `IPSR: Title of result ${newResult.id} rebuilt from core innovation ${newCoreLink.result_id} (previously ${previousCoreInnovationId}).`,
    );
  }

  async $_versionManagement(
    result: Result,
    phase: Version,
    user: TokenDto,
    module_id: number,
    entity_id?: number,
    same_portfolio_phase_change?: boolean,
  ) {
    switch (module_id) {
      case 1:
        return await this.$_phaseChangeReporting(
          result,
          phase,
          user,
          entity_id,
          same_portfolio_phase_change,
        );
      case 2:
        return await this.$_phaseChangeIPSR(
          result,
          phase,
          user,
          entity_id,
          same_portfolio_phase_change,
        );
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

    const ownerInitiative =
      await this._resultByInitiativesRepository.getOwnerInitiativeByResult(
        legacy_result.id,
      );
    if (ownerInitiative?.inititiative_id) {
      const primaryPortfolio = await this._clarisaInitiativesRepository.findOne(
        {
          where: { id: ownerInitiative.inititiative_id },
          select: { portfolio_id: true },
        },
      );
      if (primaryPortfolio?.portfolio_id === PORTFOLIO_CGIAR_PROGRAMS_P25_ID) {
        // P2-3229. A W3/Bilateral result always maps to a Science Program, which is always
        // P25, so this branch is the only one it can reach — and asking the caller for an
        // `entityId` would be asking it to restate something the result already says. The
        // programme is derived from the result's own role-1 initiative and V2 runs with it,
        // exactly as the API path does, so both entry points send the same thing.
        if (legacy_result.source === SourceEnum.Bilateral) {
          const entityId = await this._bilateralRules.resolveTargetEntityId(
            legacy_result,
            String(legacy_result.result_code ?? legacy_result.id),
          );
          return await this.versionProcessV2(legacy_result.id, entityId, user);
        }

        throw ReturnResponseUtil.format({
          message: `Results whose primary submitter is already a P25 CGIAR Program must use phase change with entityId (V2).`,
          response: legacy_result.id,
          statusCode: HttpStatus.CONFLICT,
        });
      }
    }

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

  /**
   * Gate for carrying a W3/Bilateral result forward from the reporting tool (P2-3229).
   *
   * Non-bilateral results fall straight through: W1/W2 keeps the rules it already had, and
   * AVISA (`SGP-02`) results are handled by the pool-funding branch in the results list, so
   * they never reach here as bilaterals.
   *
   * Eligibility comes from `BilateralVersioningRulesService`, the same leaf service the API
   * endpoint uses. That is deliberate: AC9 requires both paths to accept and refuse the same
   * things, and one shared implementation is the only version of that which stays true.
   *
   * Authorisation is what differs by caller. Here it is the JWT user's membership of the
   * result's **lead** centre — a contributing centre is not enough. Admins pass, consistent
   * with every other role check in the platform.
   */
  private async assertBilateralVersioningAllowed(
    result: Result,
    user: TokenDto,
  ): Promise<void> {
    if (result.source !== SourceEnum.Bilateral) return;

    const resultCode = String(result.result_code ?? result.id);
    const activePhase = await this._bilateralRules.getActiveReportingPhase();

    // Re-resolves from the code rather than trusting the row handed in: this is where "already
    // carried forward" and "only exists in the current phase" are caught, and both are about
    // the set of rows for that code, not about this one.
    await this._bilateralRules.resolveVersionableResult(
      resultCode,
      activePhase.id,
    );

    const leadCenterCode = await this._bilateralRules.resolveLeadCenterCode(
      result.id,
    );
    if (!leadCenterCode) {
      throw ReturnResponseUtil.format({
        message: `Result ${resultCode} has no lead centre, so there is nobody who can carry it forward.`,
        response: result.id,
        statusCode: HttpStatus.FORBIDDEN,
      });
    }

    const roles = await this._roleByUserRepository.getAllRolesByUser(user.id);
    const isAdmin = (roles ?? []).some((role: any) => +role.role_id === 1);
    const belongsToLeadCentre = (roles ?? []).some(
      (role: any) => role.center_id === leadCenterCode,
    );

    if (!isAdmin && !belongsToLeadCentre) {
      throw ReturnResponseUtil.format({
        message: `Only users of centre ${leadCenterCode}, which leads result ${resultCode}, can carry it into a new phase.`,
        response: result.id,
        statusCode: HttpStatus.FORBIDDEN,
      });
    }
  }

  async versionProcessV2(result_id: number, entity_id: number, user: TokenDto) {
    const entity = await this._clarisaInitiativesRepository.findOne({
      where: { id: entity_id, active: true },
    });

    if (entity?.portfolio_id !== PORTFOLIO_CGIAR_PROGRAMS_P25_ID) {
      throw ReturnResponseUtil.format({
        message: `Replication is only allowed for entities with portfolio_id = ${PORTFOLIO_CGIAR_PROGRAMS_P25_ID}`,
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

    // P2-3229. A W3/Bilateral result carried forward from the reporting tool answers to the
    // bilateral rules, not the pool-funding ones: it must be approved, from a previous phase,
    // not already carried forward, and not a Knowledge Product — the same set the API path
    // applies, from the same service, so the two cannot drift (AC9). And only a user of the
    // result's LEAD centre may do it, which is the check the menu in the results list mirrors
    // for UX but cannot be trusted to enforce.
    await this.assertBilateralVersioningAllowed(legacy_result, user);

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

    const primarySourceInitiative =
      await this._clarisaInitiativesRepository.findOne({
        where: { id: mainInitiative.initiative_id, active: true },
        select: { id: true, portfolio_id: true },
      });

    const isP25SelfEntity =
      primarySourceInitiative?.portfolio_id ===
        PORTFOLIO_CGIAR_PROGRAMS_P25_ID &&
      Number(mainInitiative.initiative_id) === Number(entity_id);

    if (!isP25SelfEntity) {
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
    }

    const same_portfolio_phase_change =
      primarySourceInitiative?.portfolio_id === PORTFOLIO_CGIAR_PROGRAMS_P25_ID;

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
        same_portfolio_phase_change,
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
      if (await this.$_genericValidation(r.result_code, phase.id)) {
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

    if (res.length) {
      const ids = res.map((r) => r.id);

      const [resultsWithPhase, versionsWithPrevPhase] = await Promise.all([
        this._resultRepository.find({
          select: ['version_id'],
          where: { version_id: In(ids), is_active: true },
        }),
        this._versionRepository.find({
          select: ['previous_phase'],
          where: { previous_phase: In(ids), is_active: true },
        }),
      ]);

      const versionIdsWithResults = new Set(
        resultsWithPhase.map((r) => r.version_id),
      );
      const versionIdsAsPrevious = new Set(
        versionsWithPrevPhase.map((v) => v.previous_phase),
      );

      for (const row of res) {
        row['can_be_deleted'] =
          !versionIdsWithResults.has(row.id) &&
          !versionIdsAsPrevious.has(row.id);
      }
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
        obj_portfolio: true,
      },
    });

    return ReturnResponseUtil.format({
      message: `Phase Retrieved Successfully`,
      response: res,
      statusCode: HttpStatus.OK,
    });
  }

  /**
   * Phases in which a result CODE exists. Feeds the result-detail screen when the code/phase pair
   * in the URL has no row: without an internal id, `getVersionOfAResult` cannot be used, and the
   * screen still has to say in which years the result DOES exist.
   */
  async getVersionsOfAResultCode(result_code: number) {
    const versions_id =
      await this._versionRepository.$_getVersionsOfAResultCode(result_code);

    const res = versions_id.length
      ? await this._versionRepository.find({
          where: {
            id: In(versions_id),
          },
        })
      : [];

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
