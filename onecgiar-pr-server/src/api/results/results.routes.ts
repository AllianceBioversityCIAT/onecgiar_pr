import { Routes } from '@nestjs/core';
import { GenderTagLevelsModule } from './gender_tag_levels/gender_tag_levels.module';
import { InstitutionRolesModule } from './institution_roles/institution_roles.module';
import { ResultsByInititiativesModule } from './results_by_inititiatives/results_by_inititiatives.module';
import { ResultsByInstitutionsModule } from './results_by_institutions/results_by_institutions.module';
import { ResultsByInstitutionTypesModule } from './results_by_institution_types/results_by_institution_types.module';
import { ResultLevelsModule } from './result_levels/result_levels.module';
import { ResultTypesModule } from './result_types/result_types.module';
import { VersionsModule } from './versions/versions.module';
import { ResultByLevelModule } from './result-by-level/result-by-level.module';
import { PartnerDeliveryTypeModule } from './partner-delivery-type/partner-delivery-type.module';
import { ResultCountry } from './result-countries/entities/result-country.entity';
import { LinkedResultsModule } from './linked-results/linked-results.module';
import { EvidencesModule } from './evidences/evidences.module';
import { ResultsKnowledgeProductsModule } from './results-knowledge-products/results-knowledge-products.module';
import { NonPooledProjectsModule } from './non-pooled-projects/non-pooled-projects.module';
import { ResultsCentersModule } from './results-centers/results-centers.module';
import { ResultsTocResultsModule } from './results-toc-results/results-toc-results.module';
import { CapdevsDeliveryMethodsModule } from './capdevs-delivery-methods/capdevs-delivery-methods.module';
import { CapdevsTermsModule } from './capdevs-terms/capdevs-terms.module';
import { SummaryModule } from './summary/summary.module';
import { ResultsImpactAreaIndicatorsModule } from './results-impact-area-indicators/results-impact-area-indicators.module';
import { ResultsImpactAreaTargetModule } from './results-impact-area-target/results-impact-area-target.module';
import { OstMeliaStudiesModule } from './ost-melia-studies/ost-melia-studies.module';
import { ResultsValidationModuleModule } from './results-validation-module/results-validation-module.module';
import { ShareResultRequestModule } from './share-result-request/share-result-request.module';
import { SubmissionsModule } from './submissions/submissions.module';

export const ResultsRoutes: Routes = [
  {
    path: 'gender-tag-levels',
    module: GenderTagLevelsModule,
  },
  {
    path: 'institution-roles',
    module: InstitutionRolesModule,
  },
  {
    path: 'levels',
    module: ResultLevelsModule,
  },
  {
    path: 'types',
    module: ResultTypesModule,
  },
  {
    path: 'results-by-initiatives',
    module: ResultsByInititiativesModule,
  },
  {
    path: 'results-by-institution-types',
    module: ResultsByInstitutionTypesModule,
  },
  {
    path: 'results-by-institutions',
    module: ResultsByInstitutionsModule,
  },
  {
    path: 'versions',
    module: VersionsModule,
  },
  {
    path: 'type-by-level',
    module: ResultByLevelModule,
  },
  {
    path: 'partner-delivery-type',
    module: PartnerDeliveryTypeModule,
  },
  {
    path: 'result-countries',
    module: ResultCountry,
  },
  {
    path: 'linked',
    module: LinkedResultsModule,
  },
  {
    path: 'evidences',
    module: EvidencesModule,
  },
  {
    path: 'results-knowledge-products',
    module: ResultsKnowledgeProductsModule,
  },
  {
    path: 'non-pooled-projects',
    module: NonPooledProjectsModule,
  },
  {
    path: 'centers',
    module: ResultsCentersModule,
  },
  {
    path: 'toc',
    module: ResultsTocResultsModule,
  },
  {
    path: 'capdevs-delivery-methods',
    module: CapdevsDeliveryMethodsModule,
  },
  {
    path: 'capdevs-terms',
    module: CapdevsTermsModule,
  },
  {
    path: 'summary',
    module: SummaryModule,
  },
  {
    path: 'impact-area-indicators',
    module: ResultsImpactAreaIndicatorsModule,
  },
  {
    path: 'impact-area-target',
    module: ResultsImpactAreaTargetModule,
  },
  {
    path: 'request',
    module: ShareResultRequestModule,
  },
  {
    path: 'melia-studies',
    module: OstMeliaStudiesModule,
  },
  {
    path: 'results-validation',
    module: ResultsValidationModuleModule
  },
  {
    path: 'submissions',
    module: SubmissionsModule
  }
];
