import { Routes } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { HomeModule } from './api/home/home.module';
import { ResultsModule } from './api/results/results.module';
import { TypeOneReportModule } from './api/type-one-report/type-one-report.module';
import { ClarisaRoutes } from './api/clarisa/clarisa.routes';
import { AuthModulesRoutes } from './auth/modules/auth-modules.routes';
import { ModulesRoutes } from './api/modules.routes';

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
];
