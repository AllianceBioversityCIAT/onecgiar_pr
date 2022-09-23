import { Routes } from '@nestjs/core';
import { ClarisaActionAreasModule } from '../clarisa-action-areas/clarisa-action-areas.module';

export const ClarisaImpactAreaRoutes: Routes = [
  {
    path: '',
    module: ClarisaActionAreasModule,
  },
];
