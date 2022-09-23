import { Routes } from '@nestjs/core';
import { ClarisaInstitutionsModule } from './clarisa-institutions.module';

export const ClarisaInstitutionsRoutes: Routes = [
  {
    path: '',
    module: ClarisaInstitutionsModule,
  },
];
