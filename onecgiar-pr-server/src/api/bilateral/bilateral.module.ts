import { Module } from '@nestjs/common';
import { BilateralService } from './bilateral.service';
import { BilateralController } from './bilateral.controller';
import { ResultsModule } from '../results/results.module';
import { VersioningModule } from '../versioning/versioning.module';
import { UserModule } from '../../auth/modules/user/user.module';
import { ClarisaRegionsModule } from '../../clarisa/clarisa-regions/clarisa-regions.module';
import { YearsModule } from '../results/years/years.module';
import { SubmissionsModule } from '../results/submissions/submissions.module';
import { ClarisaGeographicScopesModule } from '../../clarisa/clarisa-geographic-scopes/clarisa-geographic-scopes.module';
import { ResultRegionsModule } from '../results/result-regions/result-regions.module';
import { ClarisaCountriesModule } from '../../clarisa/clarisa-countries/clarisa-countries.module';
import { ResultCountriesModule } from '../results/result-countries/result-countries.module';
import { ClarisaSubnationalScopeModule } from '../../clarisa/clarisa-subnational-scope/clarisa-subnational-scope.module';
import { ResultCountriesSubNationalModule } from '../results/result-countries-sub-national/result-countries-sub-national.module';
import { ResultsByInstitutionsModule } from '../results/results_by_institutions/results_by_institutions.module';
import { ClarisaInstitutionsModule } from '../../clarisa/clarisa-institutions/clarisa-institutions.module';
import { EvidencesModule } from '../results/evidences/evidences.module';
import { ResultsKnowledgeProductsModule } from '../results/results-knowledge-products/results-knowledge-products.module';
import { ClarisaCentersModule } from '../../clarisa/clarisa-centers/clarisa-centers.module';
import { NonPooledProjectsModule } from '../results/non-pooled-projects/non-pooled-projects.module';
import { ResultTypesModule } from '../results/result_types/result_types.module';
import { ResultsTocResultsModule } from '../results/results-toc-results/results-toc-results.module';
import { ResultsCentersModule } from '../results/results-centers/results-centers.module';
import { ClarisaProjectsModule } from '../../clarisa/clarisa-projects/clarisa-projects.module';
import { ResultsByProjectsModule } from '../results/results_by_projects/results_by_projects.module';
import { CapdevsTermsModule } from '../results/capdevs-terms/capdevs-terms.module';
import { CapdevsDeliveryMethodsModule } from '../results/capdevs-delivery-methods/capdevs-delivery-methods.module';
import { ClarisaInnovationReadinessLevelsModule } from '../../clarisa/clarisa-innovation-readiness-levels/clarisa-innovation-readiness-levels.module';
import { ClarisaInnovationUseLevelsModule } from '../../clarisa/clarisa-innovation-use-levels/clarisa-innovation-use-levels.module';
import { ClarisaPolicyTypesModule } from '../../clarisa/clarisa-policy-types/clarisa-policy-types.module';
import { ClarisaPolicyStagesModule } from '../../clarisa/clarisa-policy-stages/clarisa-policy-stages.module';
import { KnowledgeProductBilateralHandler } from './handlers/knowledge-product.handler';
import { CapacityChangeBilateralHandler } from './handlers/capacity-change.handler';
import { InnovationDevelopmentBilateralHandler } from './handlers/innovation-development.handler';
import { InnovationUseBilateralHandler } from './handlers/innovation-use.handler';
import { PolicyChangeBilateralHandler } from './handlers/policy-change.handler';
import { ResultsInnovationsDevRepository } from '../results/summary/repositories/results-innovations-dev.repository';
import { ResultsInnovationsUseRepository } from '../results/summary/repositories/results-innovations-use.repository';
import { ResultsPolicyChangesRepository } from '../results/summary/repositories/results-policy-changes.repository';
import { NoopBilateralHandler } from './handlers/noop.handler';

@Module({
  imports: [
    ResultsModule,
    VersioningModule,
    UserModule,
    ClarisaRegionsModule,
    YearsModule,
    SubmissionsModule,
    ClarisaGeographicScopesModule,
    ResultRegionsModule,
    ClarisaCountriesModule,
    ResultCountriesModule,
    ClarisaSubnationalScopeModule,
    ResultCountriesSubNationalModule,
    ResultsByInstitutionsModule,
    ClarisaInstitutionsModule,
    EvidencesModule,
    ResultsKnowledgeProductsModule,
    ClarisaCentersModule,
    NonPooledProjectsModule,
    ResultTypesModule,
    ResultsTocResultsModule,
    ResultsCentersModule,
    ClarisaProjectsModule,
    ResultsByProjectsModule,
    CapdevsTermsModule,
    CapdevsDeliveryMethodsModule,
    ClarisaInnovationReadinessLevelsModule,
    ClarisaInnovationUseLevelsModule,
    ClarisaPolicyTypesModule,
    ClarisaPolicyStagesModule,
  ],
  controllers: [BilateralController],
  providers: [
    BilateralService,
    KnowledgeProductBilateralHandler,
    CapacityChangeBilateralHandler,
    InnovationDevelopmentBilateralHandler,
    InnovationUseBilateralHandler,
    PolicyChangeBilateralHandler,
    NoopBilateralHandler,
    ResultsInnovationsDevRepository,
    ResultsInnovationsUseRepository,
    ResultsPolicyChangesRepository,
  ],
})
export class BilateralModule {}
