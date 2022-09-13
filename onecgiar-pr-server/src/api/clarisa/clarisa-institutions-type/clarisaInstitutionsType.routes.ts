import { Routes } from '@nestjs/core';
import { ClarisaInstitutionsTypeModule } from './clarisa-institutions-type.module';

export const ClarisaInstitutionsTypeRoutes: Routes = [
  {
    path: '',
    module: ClarisaInstitutionsTypeModule,
  },
];
