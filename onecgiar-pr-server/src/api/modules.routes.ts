import { Routes } from '@nestjs/core';
import { HomeModule } from './home/home.module';
import { ResultsModule } from './results/results.module';
import { ResultsRoutes } from './results/results.routes';
import { TypeOneReportModule } from './type-one-report/type-one-report.module';
import { ClarisaConnectionsModule } from '../clarisa/clarisa-connections/clarisa-connections.module';
import { typeOneReportRoutes } from './type-one-report/type-one-report.routes';
import { IpsrModule } from './ipsr/ipsr.module';
import { IpsrRoutes } from './ipsr/ipsr.routes';
import { PlatformReportModule } from './platform-report/platform-report.module';
import { VersioningModule } from './versioning/versioning.module';
import { GlobalNarrativesModule } from './global-narratives/global-narratives.module';
import { DeleteRecoverDataModule } from './delete-recover-data/delete-recover-data.module';
import { GlobalParameterModule } from './global-parameter/global-parameter.module';
import { UserNotificationSettingsModule } from './user_notification_settings/user_notification_settings.module';

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
    path: 'platform-report',
    module: PlatformReportModule,
  },
  {
    path: 'versioning',
    module: VersioningModule,
  },
  {
    path: 'global-narratives',
    module: GlobalNarrativesModule,
  },
  {
    path: 'global-parameters',
    module: GlobalParameterModule,
  },
  {
    path: 'manage-data',
    module: DeleteRecoverDataModule,
  },
  {
    path: 'user-notification-settings',
    module: UserNotificationSettingsModule,
  }
];
