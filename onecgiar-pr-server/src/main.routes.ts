import { Routes } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { HomeModule } from './modules/home/home.module';
import { ResultsModule } from './modules/results/results.module';
import { TypeOneReportModule } from './modules/type-one-report/type-one-report.module';
import { ClarisaRoutes } from './modules/clarisa/clarisa.routes';
import { AuthModulesRoutes } from './auth/modules/auth-modules.routes';

const ApiMainRoutes: Routes = [
  {
    path: 'auth',
    module: AuthModule,
    children: AuthModulesRoutes
  },
  {
    path: 'home',
    module: HomeModule,
  },
  {
    path: 'results',
    module: ResultsModule,
  },
  {
    path: 'type-one-report',
    module: TypeOneReportModule,
  },
  {
    path: 'clarisa',
    children: ClarisaRoutes,
  }
];

export const MainRoutes: Routes = [
  {
    path: 'api',
    children: ApiMainRoutes,
  },
];
