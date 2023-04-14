import { Routes } from '@nestjs/core';
import { ResultReportModule } from './result-report/result-report.module';

export const publicReportRoutes: Routes = [
  {
    path: 'result',
    module: ResultReportModule,
  },
];
