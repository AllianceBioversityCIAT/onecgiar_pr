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
    module: PartnerDeliveryTypeModule
  }
];
