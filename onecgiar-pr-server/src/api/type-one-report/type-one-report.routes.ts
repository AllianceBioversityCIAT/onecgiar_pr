import { Routes } from '@nestjs/core';
import { PrimaryImpactAreaModule } from './primary-impact-area/primary-impact-area.module';

export const typeOneReportRoutes: Routes = [
  {
    path: 'primary',
    module: PrimaryImpactAreaModule,
  },
];
