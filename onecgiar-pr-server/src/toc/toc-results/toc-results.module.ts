import { Module, forwardRef } from '@nestjs/common';
import { TocResultsService } from './toc-results.service';
import { TocResultsController } from './toc-results.controller';
import { TocResultsRepository } from './toc-results.repository';
import { VersioningService } from '../../api/versioning/versioning.service';
import { VersionRepository } from '../../api/versioning/versioning.repository';
import { ResultRepository } from '../../api/results/result.repository';
import { ApplicationModulesRepository } from '../../api/versioning/repositories/application-modules.repository';
import { NonPooledProjectRepository } from '../../api/results/non-pooled-projects/non-pooled-projects.repository';
import { ResultsCenterRepository } from '../../api/results/results-centers/results-centers.repository';
import { ResultsTocResultRepository } from '../../api/results/results-toc-results/repositories/results-toc-results.repository';
import { ResultByInitiativesRepository } from '../../api/results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultsKnowledgeProductInstitutionRepository } from '../../api/results/results-knowledge-products/repositories/results-knowledge-product-institution.repository';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { ResultByIntitutionsRepository } from '../../api/results/results_by_institutions/result_by_intitutions.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../../api/results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultByIntitutionsTypeRepository } from '../../api/results/results_by_institution_types/result_by_intitutions_type.repository';
import { ResultCountryRepository } from '../../api/results/result-countries/result-countries.repository';
import { ResultRegionRepository } from '../../api/results/result-regions/result-regions.repository';
import { LinkedResultRepository } from '../../api/results/linked-results/linked-results.repository';
import { EvidencesRepository } from '../../api/results/evidences/evidences.repository';
import { ResultsCapacityDevelopmentsRepository } from '../../api/results/summary/repositories/results-capacity-developments.repository';
import { ResultsImpactAreaIndicatorRepository } from '../../api/results/results-impact-area-indicators/results-impact-area-indicators.repository';
import { ResultsPolicyChangesRepository } from '../../api/results/summary/repositories/results-policy-changes.repository';
import { ResultsInnovationsDevRepository } from '../../api/results/summary/repositories/results-innovations-dev.repository';
import { ResultsInnovationsUseRepository } from '../../api/results/summary/repositories/results-innovations-use.repository';
import { ResultsInnovationsUseMeasuresRepository } from '../../api/results/summary/repositories/results-innovations-use-measures.repository';
import { ResultsKnowledgeProductsRepository } from '../../api/results/results-knowledge-products/repositories/results-knowledge-products.repository';
import { ResultsKnowledgeProductAltmetricRepository } from '../../api/results/results-knowledge-products/repositories/results-knowledge-product-altmetrics.repository';
import { ResultsKnowledgeProductAuthorRepository } from '../../api/results/results-knowledge-products/repositories/results-knowledge-product-authors.repository';
import { ResultsKnowledgeProductKeywordRepository } from '../../api/results/results-knowledge-products/repositories/results-knowledge-product-keywords.repository';
import { ResultsKnowledgeProductMetadataRepository } from '../../api/results/results-knowledge-products/repositories/results-knowledge-product-metadata.repository';
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { ResultsTocResultIndicatorsRepository } from '../../api/results/results-toc-results/repositories/results-toc-results-indicators.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../shared/handlers/error.utils';
import { ResultsTocImpactAreaTargetRepository } from 'src/api/results/results-toc-results/repositories/result-toc-impact-area-repository';
import { ResultsTocSdgTargetRepository } from 'src/api/results/results-toc-results/repositories/result-toc-sdg-target-repository';
import { ResultsSdgTargetRepository } from 'src/api/results/results-toc-results/repositories/results-sdg-targets.respository';
import { ResultsActionAreaOutcomeRepository } from 'src/api/results/results-toc-results/repositories/result-toc-action-area.repository';
import { ResultsTocTargetIndicatorRepository } from 'src/api/results/results-toc-results/repositories/result-toc-result-target-indicator.repository';
import { ResultInitiativeBudgetRepository } from '../../api/results/result_budget/repositories/result_initiative_budget.repository';
import { ResultTypeRepository } from '../../api/results/result_types/resultType.repository';
import { EvidenceSharepointRepository } from '../../api/results/evidences/repositories/evidence-sharepoint.repository';
import { EvidencesService } from '../../api/results/evidences/evidences.service';
import { SharePointModule } from '../../shared/services/share-point/share-point.module';
import { ShareResultRequestRepository } from '../../api/results/share-result-request/share-result-request.repository';
import { VersioningModule } from '../../api/versioning/versioning.module';
import { ResultInnovationPackageModule } from '../../api/ipsr/result-innovation-package/result-innovation-package.module';
import { InnovationPathwayModule } from '../../api/ipsr/innovation-pathway/innovation-pathway.module';
import { ResultIpAAOutcomeRepository } from '../../api/ipsr/innovation-pathway/repository/result-ip-action-area-outcome.repository';
import { ResultIpEoiOutcomeRepository } from '../../api/ipsr/innovation-pathway/repository/result-ip-eoi-outcomes.repository';
import { ResultIpImpactAreaRepository } from '../../api/ipsr/innovation-pathway/repository/result-ip-impact-area-targets.repository';
import { ResultIpSdgTargetRepository } from '../../api/ipsr/innovation-pathway/repository/result-ip-sdg-targets.repository';
import { InnovationPackagingExpertRepository } from '../../api/ipsr/innovation-packaging-experts/repositories/innovation-packaging-expert.repository';
import { ResultIpMeasureRepository } from '../../api/ipsr/result-ip-measures/result-ip-measures.repository';
import { ResultIpExpertisesRepository } from '../../api/ipsr/innovation-packaging-experts/repositories/result-ip-expertises.repository';
import { ResultIpExpertWorkshopOrganizedRepostory } from '../../api/ipsr/innovation-pathway/repository/result-ip-expert-workshop-organized.repository';
import { ResultsIpActorRepository } from '../../api/ipsr/results-ip-actors/results-ip-actor.repository';
import { ResultsByIpInnovationUseMeasureRepository } from '../../api/ipsr/results-by-ip-innovation-use-measures/results-by-ip-innovation-use-measure.repository';
import { ResultsIpInstitutionTypeRepository } from '../../api/ipsr/results-ip-institution-type/results-ip-institution-type.repository';
import { ResultActorRepository } from '../../api/results/result-actors/repositories/result-actors.repository';
import { ResultInstitutionsBudgetRepository } from '../../api/results/result_budget/repositories/result_institutions_budget.repository';
import { NonPooledProjectBudgetRepository } from '../../api/results/result_budget/repositories/non_pooled_proyect_budget.repository';
import { ResultCountrySubnationalRepository } from '../../api/results/result-countries-sub-national/repositories/result-country-subnational.repository';
import { ResultsTocResultIndicatorsService } from '../../api/results/results-toc-results/results-toc-result-indicators.service';
import { ResultAnswerRepository } from '../../api/results/result-questions/repository/result-answers.repository';
import { MQAPModule } from '../../api/m-qap/m-qap.module';
import { ClarisaInitiativesRepository } from '../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';

@Module({
  controllers: [TocResultsController],
  providers: [
    TocResultsService,
    TocResultsRepository,
    VersioningService,
    VersionRepository,
    HandlersError,
    ResponseInterceptor,
    ApplicationModulesRepository,
    ResultRepository,
    ReturnResponse,
    NonPooledProjectRepository,
    ResultsCenterRepository,
    ResultsTocResultRepository,
    ResultByInitiativesRepository,
    ResultByIntitutionsRepository,
    ResultByInstitutionsByDeliveriesTypeRepository,
    ResultByIntitutionsTypeRepository,
    ResultCountryRepository,
    ResultRegionRepository,
    LinkedResultRepository,
    EvidencesRepository,
    ResultsCapacityDevelopmentsRepository,
    ResultsImpactAreaIndicatorRepository,
    ResultsPolicyChangesRepository,
    ResultsInnovationsDevRepository,
    ResultsInnovationsUseRepository,
    ResultsInnovationsUseMeasuresRepository,
    ResultsKnowledgeProductsRepository,
    ResultsKnowledgeProductAltmetricRepository,
    ResultsKnowledgeProductAuthorRepository,
    ResultsKnowledgeProductKeywordRepository,
    ResultsKnowledgeProductMetadataRepository,
    ResultsKnowledgeProductInstitutionRepository,
    RoleByUserRepository,
    ResultsTocResultIndicatorsRepository,
    ResultsTocSdgTargetRepository,
    ResultsTocImpactAreaTargetRepository,
    ResultsSdgTargetRepository,
    ResultsActionAreaOutcomeRepository,
    ResultsTocTargetIndicatorRepository,
    ResultInitiativeBudgetRepository,
    ResultTypeRepository,
    NonPooledProjectBudgetRepository,
    ResultInstitutionsBudgetRepository,
    EvidenceSharepointRepository,
    EvidencesService,
    ShareResultRequestRepository,
    ResultActorRepository,
    ResultIpAAOutcomeRepository,
    ResultIpEoiOutcomeRepository,
    ResultIpImpactAreaRepository,
    ResultIpSdgTargetRepository,
    InnovationPackagingExpertRepository,
    ResultIpMeasureRepository,
    ResultIpExpertisesRepository,
    ResultIpExpertWorkshopOrganizedRepostory,
    ResultsIpActorRepository,
    ResultsByIpInnovationUseMeasureRepository,
    ResultsIpInstitutionTypeRepository,
    ResultCountrySubnationalRepository,
    ResultsTocResultIndicatorsService,
    ResultAnswerRepository,
    ClarisaInitiativesRepository,
  ],
  imports: [
    SharePointModule,
    MQAPModule,
    forwardRef(() => VersioningModule),
    forwardRef(() => ResultInnovationPackageModule),
    forwardRef(() => InnovationPathwayModule),
  ],
  exports: [TocResultsRepository],
})
export class TocResultsModule {}
