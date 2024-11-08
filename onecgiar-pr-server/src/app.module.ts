import { TocModule } from './toc/toc.module';
import { ClarisaModule } from './clarisa/clarisa.module';
import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_FILTER, RouterModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MainRoutes } from './main.routes';
import { ResultsModule } from './api/results/results.module';
import { HomeModule } from './api/home/home.module';
import { TypeOneReportModule } from './api/type-one-report/type-one-report.module';
import { dataSource } from './config/orm.config';
import { JwtMiddleware } from './auth/Middlewares/jwt.middleware';
import { UserModule } from './auth/modules/user/user.module';
import { RoleModule } from './auth/modules/role/role.module';
import { JwtService } from '@nestjs/jwt';
import { User } from './auth/modules/user/entities/user.entity';
import { Repository } from 'typeorm';
import { HttpExceptionFilter } from './shared/handlers/error.exception';
import { ScheduleModule } from '@nestjs/schedule';
import { TocResultsModule } from './toc/toc-results/toc-results.module';
import { TocLevelModule } from './toc/toc-level/toc-level.module';
import { MQAPModule } from './api/m-qap/m-qap.module';
import { ElasticModule } from './elastic/elastic.module';

import { ResultDashboardBIdModule } from './result-dashboard-bi/result-dashboard.module';
import { DynamodbLogsModule } from './connection/dynamodb-logs/dynamodb-logs.module';
import { IpsrModule } from './api/ipsr/ipsr.module';
import { PlatformReportModule } from './api/platform-report/platform-report.module';
import { VersioningModule } from './api/versioning/versioning.module';
import { GlobalNarrativesModule } from './api/global-narratives/global-narratives.module';
import { DeleteRecoverDataModule } from './api/delete-recover-data/delete-recover-data.module';
import { GlobalParameterModule } from './api/global-parameter/global-parameter.module';
import { SharePointModule } from './shared/services/share-point/share-point.module';
import { NotificationModule } from './api/notification/notification.module';
import { UserNotificationSettingsModule } from './api/user-notification-settings/user-notification-settings.module';
import { EmailNotificationManagementModule } from './shared/microservices/email-notification-management/email-notification-management.module';
import { ContributionToIndicatorsModule } from './api/contribution-to-indicators/contribution-to-indicators.module';

@Module({
  imports: [
    TocModule,
    ClarisaModule,
    AuthModule,
    HomeModule,
    ResultsModule,
    IpsrModule,
    TypeOneReportModule,
    TypeOrmModule.forRoot({
      ...dataSource.options,
      keepConnectionAlive: true,
      autoLoadEntities: true,
    }),
    ClarisaModule,
    UserModule,
    RoleModule,
    MQAPModule,
    TypeOrmModule.forFeature([User]),
    ScheduleModule.forRoot(),
    TocLevelModule,
    TocResultsModule,
    RouterModule.register(MainRoutes),
    ElasticModule,
    ResultDashboardBIdModule,
    DynamodbLogsModule,
    IpsrModule,
    PlatformReportModule,
    VersioningModule,
    GlobalNarrativesModule,
    DeleteRecoverDataModule,
    GlobalParameterModule,
    SharePointModule,
    UserNotificationSettingsModule,
    EmailNotificationManagementModule,
    NotificationModule,
    ContributionToIndicatorsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtService,
    JwtMiddleware,
    Repository,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes(
      {
        path: 'api/',
        method: RequestMethod.ALL,
      },
      {
        path: 'type-one-report',
        method: RequestMethod.ALL,
      },
    );
  }
}
