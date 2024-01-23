import { Module } from '@nestjs/common';
import { VersioningService } from './versioning.service';
import { VersioningController } from './versioning.controller';
import { VersionRepository } from './versioning.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../shared/handlers/error.utils';
import { ResponseInterceptor } from '../../shared/Interceptors/Return-data.interceptor';
import { ApplicationModulesRepository } from './repositories/application-modules.repository';
import { ResultRepository } from '../results/result.repository';
import { NonPooledProjectRepository } from '../results/non-pooled-projects/non-pooled-projects.repository';
import { ResultsCenterRepository } from '../results/results-centers/results-centers.repository';
import { ResultsTocResultRepository } from '../results/results-toc-results/results-toc-results.repository';
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
import { RoleByUserRepository } from '../../auth/modules/role-by-user/RoleByUser.repository';
import { ResultsTocResultIndicatorsRepository } from '../results/results-toc-results/results-toc-results-indicators.repository';
import { ResultsTocImpactAreaTargetRepository } from '../results/results-toc-results/result-toc-impact-area-repository';
import { ResultsTocSdgTargetRepository } from '../results/results-toc-results/result-toc-sdg-target-repository';
import { ResultsSdgTargetRepository } from '../results/results-toc-results/results-sdg-targets.respository';
import { ResultStatusRepository } from '../results/result-status/result-status.repository';
import { ResultsActionAreaOutcomeRepository } from '../results/results-toc-results/result-toc-action-area.repository';
import { ResultsTocTargetIndicatorRepository } from '../results/results-toc-results/result-toc-result-target-indicator.repository';
import { ResultInitiativeBudgetRepository } from '../results/result_budget/repositories/result_initiative_budget.repository';
import { ResultTypeRepository } from '../results/result_types/resultType.repository';
import { EvidenceSharepointRepository } from '../results/evidences/repositories/evidence-sharepoint.repository';
import { EvidencesService } from '../results/evidences/evidences.service';
import { SharePointModule } from '../../shared/services/share-point/share-point.module';
import { ShareResultRequestRepository } from '../results/share-result-request/share-result-request.repository';

@Module({
  controllers: [VersioningController],
  providers: [
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
    ResultStatusRepository,
    ResultsActionAreaOutcomeRepository,
    ResultsTocTargetIndicatorRepository,
    ResultInitiativeBudgetRepository,
    ResultTypeRepository,
    EvidenceSharepointRepository,
    EvidencesService,
    ShareResultRequestRepository,
  ],
  exports: [
    EvidencesService,
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
    ResultInitiativeBudgetRepository,
    ResultTypeRepository,
    EvidenceSharepointRepository,
    ShareResultRequestRepository,
  ],
  imports: [SharePointModule],
})
export class VersioningModule {}
