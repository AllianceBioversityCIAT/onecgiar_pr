import { MiddlewareModule } from './Middlewares/middleware.module';
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { MainRoutes } from './main.routes';
import { ResultsModule } from './modules/results/results.module';
import { HomeModule } from './modules/home/home.module';
import { TypeOneReportModule } from './modules/type-one-report/type-one-report.module';
import { dataSource } from './config/orm.config';
import { JwtMiddleware } from './Middlewares/jwt.middleware';
import { ClarisaActionAreasModule } from './modules/clarisa/clarisa-action-areas/clarisa-action-areas.module';
import { ClarisaActionAreasOutcomesIndicatorsModule } from './modules/clarisa/clarisa-action-areas-outcomes-indicators/clarisa-action-areas-outcomes-indicators.module';
import { ClarisaGlobalTargetModule } from './modules/clarisa/clarisa-global-target/clarisa-global-target.module';
import { ClarisaImpactAreaModule } from './modules/clarisa/clarisa-impact-area/clarisa-impact-area.module';
import { ClarisaImpactAreaIndicatorsModule } from './modules/clarisa/clarisa-impact-area-indicators/clarisa-impact-area-indicators.module';
import { ClarisaInstitutionsModule } from './modules/clarisa/clarisa-institutions/clarisa-institutions.module';
import { ClarisaInstitutionsTypeModule } from './modules/clarisa/clarisa-institutions-type/clarisa-institutions-type.module';
import { ClarisaMeliaStudyTypeModule } from './modules/clarisa/clarisa-melia-study-type/clarisa-melia-study-type.module';

@Module({
  imports: [
    AuthModule,
    HomeModule,
    ResultsModule,
    TypeOneReportModule,
    TypeOrmModule.forRoot({
      ...dataSource.options,
      keepConnectionAlive: true,
      autoLoadEntities: true,
    }),
    RouterModule.register(MainRoutes),
    ClarisaActionAreasModule,
    ClarisaActionAreasOutcomesIndicatorsModule,
    ClarisaGlobalTargetModule,
    ClarisaImpactAreaModule,
    ClarisaImpactAreaIndicatorsModule,
    ClarisaInstitutionsModule,
    ClarisaInstitutionsTypeModule,
    ClarisaMeliaStudyTypeModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    JwtMiddleware
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes(
      {
        path: 'results',
        method: RequestMethod.ALL
      },
      {
        path: 'type-one-report',
        method: RequestMethod.ALL
      },
    )
  }
}
