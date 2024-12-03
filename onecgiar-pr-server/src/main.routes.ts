import { Routes } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { ClarisaRoutes } from './clarisa/clarisa.routes';
import { AuthModulesRoutes } from './auth/modules/auth-modules.routes';
import { ModulesRoutes } from './api/modules.routes';
import { TocRoutes } from './toc/toc.routes';
import { ResultDashboardBIRoutes } from './result-dashboard-bi/result-dashboard-bi.routes';
import { dynamoRoutes } from './connection/dynamoRoutes.routes';
import { ContributionToIndicatorRoutes } from './api/contribution-to-indicators/contribution-to-indicators.routes';

export const MainRoutes: Routes = [
  {
    path: 'api',
    children: ModulesRoutes,
  },
  {
    path: 'auth',
    module: AuthModule,
    children: AuthModulesRoutes,
  },
  {
    path: 'clarisa',
    children: ClarisaRoutes,
  },
  {
    path: 'toc',
    children: TocRoutes,
  },
  {
    path: 'result-dashboard-bi',
    children: ResultDashboardBIRoutes,
  },
  {
    path: 'logs',
    children: dynamoRoutes,
  },
  {
    path: 'contribution-to-indicators',
    children: ContributionToIndicatorRoutes,
  },
];
