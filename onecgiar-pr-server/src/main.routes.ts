import { Routes } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { HomeModule } from './api/home/home.module';
import { ResultsModule } from './api/results/results.module';
import { TypeOneReportModule } from './api/type-one-report/type-one-report.module';
import { ClarisaRoutes } from './clarisa/clarisa.routes';
import { AuthModulesRoutes } from './auth/modules/auth-modules.routes';
import { ModulesRoutes } from './api/modules.routes';
import { TocRoutes } from './toc/toc.routes';
import { TocModule } from './toc/toc.module';
import { ResultDashboardBIRoutes } from './result-dashboard-bi/result-dashboard-bi.routes';
import { dynamoRoutes } from './connection/dynamoRoutes.routes';

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
    path:'result-dashboard-bi',
    children:ResultDashboardBIRoutes
  },
  {
    path: 'logs',
    children: dynamoRoutes
  }
];
