import { Routes } from '@nestjs/core';
import { HomeModule } from './home/home.module';
import { ResultsModule } from './results/results.module';
import { TypeOneReportModule } from './type-one-report/type-one-report.module';

export const ModulesRoutes: Routes = [
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
  }
];
