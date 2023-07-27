import { Module } from '@nestjs/common';
import { TocResultsService } from './toc-results.service';
import { TocResultsController } from './toc-results.controller';
import { TocResultsRepository } from './toc-results.repository';
import { VersioningService } from '../../api/versioning/versioning.service';
import { VersionRepository } from '../../api/versioning/versioning.repository';
import { ResultRepository } from '../../api/results/result.repository';
import { ApplicationModulesRepository } from '../../api/versioning/repositories/application-modules.repository';
import { NonPooledProjectRepository } from '../../api/results/non-pooled-projects/non-pooled-projects.repository';
import { ResultsCenterRepository } from '../../api/results/results-centers/results-centers.repository';
import { ResultsTocResultRepository } from '../../api/results/results-toc-results/results-toc-results.repository';
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
import {
  HandlersError,
  ReturnResponse,
} from '../../shared/handlers/error.utils';

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
  ],
  exports: [TocResultsRepository],
})
export class TocResultsModule {}
