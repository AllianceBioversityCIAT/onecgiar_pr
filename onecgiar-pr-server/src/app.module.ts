import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TocModule } from './toc/toc.module';
import { ClarisaModule } from './clarisa/clarisa.module';
import { APP_FILTER, APP_GUARD, RouterModule } from '@nestjs/core';
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
import { JwtModule, JwtService } from '@nestjs/jwt';
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
import { ResultQaedModule } from './api/result-qaed/result-qaed.module';
import { AuthMicroserviceService } from './shared/microservices/auth-microservice/auth-microservice.service';
import { AuthMicroserviceModule } from './shared/microservices/auth-microservice/auth-microservice.module';
import { AdUsersModule } from './api/ad_users/ad_users.module';
import { InitiativeEntityMapModule } from './api/initiative_entity_map/initiative_entity_map.module';
import { apiVersionMiddleware } from './shared/middleware/api-versioning.middleware';
import { ResultsFrameworkReportingModule } from './api/results-framework-reporting/results-framework-reporting.module';
import { AiModule } from './api/ai/ai.module';

@Module({
  imports: [
    JwtModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    TocModule,
    ClarisaModule,
    AuthModule,
    HomeModule,
    ResultsModule,
    IpsrModule,
    TypeOneReportModule,
    TypeOrmModule.forRoot({
      ...dataSource.options,
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
    ResultQaedModule,
    AuthMicroserviceModule,
    AdUsersModule,
    InitiativeEntityMapModule,
    ResultsFrameworkReportingModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtService,
    JwtMiddleware,
    Repository,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    AuthMicroserviceService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtMiddleware, apiVersionMiddleware)
      .exclude({ path: 'api/platform-report/(.*)', method: RequestMethod.ALL })
      .forRoutes(
        { path: 'api/(.*)', method: RequestMethod.ALL },
        { path: 'v2/(.*)', method: RequestMethod.ALL },
        { path: 'clarisa/(.*)', method: RequestMethod.ALL },
        { path: 'toc/(.*)', method: RequestMethod.ALL },
      );

    consumer
      .apply(JwtMiddleware)
      .forRoutes({ path: 'type-one-report', method: RequestMethod.ALL });
  }
}
