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
import { NotificationModule } from './notification/notification.module';
import { UserNotificationSettingsModule } from './user-notification-settings/user-notification-settings.module';
import { AdUsersModule } from './ad_users/ad_users.module';
import { InitiativeEntityMapModule } from './initiative_entity_map/initiative_entity_map.module';
import { ResultsFrameworkReportingModule } from './results-framework-reporting/results-framework-reporting.module';
import { ContributorsPartnersModule } from './results-framework-reporting/contributors-partners/contributors-partners.module';
import { InnovationDevModule } from './results-framework-reporting/innovation_dev/innovation_dev.module';
import { InnovationUseModule } from './results-framework-reporting/innovation-use/innovation-use.module';
import { AiModule } from './ai/ai.module';
import { GeographicLocationModule } from './results-framework-reporting/geographic-location/geographic-location.module';
import { IpsrGeneralInformationModule } from './ipsr-framework/ipsr_general_information/ipsr_general_information.module';
import { PathwayModule } from './ipsr-framework/pathway/pathway.module';

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
  },
  {
    path: 'notification',
    module: NotificationModule,
  },
  {
    path: 'ad-users',
    module: AdUsersModule,
  },
  {
    path: 'initiatives-entity',
    module: InitiativeEntityMapModule,
  },
  {
    path: 'results-framework-reporting',
    module: ResultsFrameworkReportingModule,
  },
  {
    path: 'contributors-partners',
    module: ContributorsPartnersModule,
  },
  {
    path: 'innovation-development',
    module: InnovationDevModule,
  },
  {
    path: 'innovation-use',
    module: InnovationUseModule,
  },
  {
    path: 'ai',
    module: AiModule,
  },
  {
    path: 'geographic-location',
    module: GeographicLocationModule,
  },
  {
    path: 'ipsr-general-information',
    module: IpsrGeneralInformationModule,
  },
  {
    path: 'ipsr-pathway',
    module: PathwayModule,
  },
];
