import { Routes } from '@nestjs/core';
import { ContributionToIndicatorsModule } from './contribution-to-indicators.module';

export const ContributionToIndicatorRoutes: Routes = [
  {
    path: '/',
    module: ContributionToIndicatorsModule,
  },
];
