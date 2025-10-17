import { Module } from '@nestjs/common';
import { BilateralService } from './bilateral.service';
import { BilateralController } from './bilateral.controller';

// Ajusta los imports para usar los módulos correctos y consistentes con tu estructura
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
  ],
  controllers: [BilateralController],
  providers: [BilateralService],
})
export class BilateralModule {}
