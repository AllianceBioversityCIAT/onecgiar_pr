import { Routes } from '@nestjs/core';
import { ClarisaActionAreasModule } from './clarisa-action-areas.module';

export const ClarisaActionAreasRoutes: Routes = [
  {
    path: '',
    module: ClarisaActionAreasModule,
  },
];
