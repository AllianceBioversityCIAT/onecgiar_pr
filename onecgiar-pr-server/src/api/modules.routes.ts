import { Routes } from '@nestjs/core';
import { HomeModule } from './home/home.module';
import { ResultsModule } from './results/results.module';
import { ResultsRoutes } from './results/results.routes';
import { TypeOneReportModule } from './type-one-report/type-one-report.module';
import { ClarisaConnectionsModule } from '../clarisa/clarisa-connections/clarisa-connections.module';
import { typeOneReportRoutes } from './type-one-report/type-one-report.routes';
import { IpsrModule } from './ipsr/ipsr.module';
import { IpsrRoutes } from './ipsr/ipsr.routes';
import { PublicReportModule } from './public-report/public-report.module';
import { publicReportRoutes } from './public-report/public-report.routes';

export const ModulesRoutes: Routes = [
  {
    path: 'home',
    module: HomeModule,
  },
  {
    path: 'results',
    module: ResultsModule,
    children: ResultsRoutes,
  },
  {
    path: 'type-one-report',
    module: TypeOneReportModule,
    children: typeOneReportRoutes,
  },
  {
    path: 'ipsr',
    module: IpsrModule,
    children: IpsrRoutes,
  },
  {
    path: 'clarisa',
    module: ClarisaConnectionsModule,
  },
  {
    path: 'public-report',
    module: PublicReportModule,
    children: publicReportRoutes,
  },
];
