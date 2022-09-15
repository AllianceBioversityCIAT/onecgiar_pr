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
import { ClarisaActionAreasModule } from './api/clarisa/clarisa-action-areas/clarisa-action-areas.module';
import { ClarisaActionAreasOutcomesIndicatorsModule } from './api/clarisa/clarisa-action-areas-outcomes-indicators/clarisa-action-areas-outcomes-indicators.module';
import { ClarisaGlobalTargetModule } from './api/clarisa/clarisa-global-target/clarisa-global-target.module';
import { ClarisaImpactAreaModule } from './api/clarisa/clarisa-impact-area/clarisa-impact-area.module';
import { ClarisaImpactAreaIndicatorsModule } from './api/clarisa/clarisa-impact-area-indicators/clarisa-impact-area-indicators.module';
import { ClarisaInstitutionsModule } from './api/clarisa/clarisa-institutions/clarisa-institutions.module';
import { ClarisaInstitutionsTypeModule } from './api/clarisa/clarisa-institutions-type/clarisa-institutions-type.module';
import { ClarisaMeliaStudyTypeModule } from './api/clarisa/clarisa-melia-study-type/clarisa-melia-study-type.module';
import { UserModule } from './auth/modules/user/user.module';
import { ComplementaryDataUserModule } from './auth/modules/complementary-data-user/complementary-data-user.module';
import { RoleModule } from './auth/modules/role/role.module';
import { RolesUserByAplicationModule } from './auth/modules/roles-user-by-aplication/roles-user-by-aplication.module';
import { AuthService } from './auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from './auth/modules/user/user.service';
import { UserRepository } from './auth/modules/user/repositories/user.repository';
import { User } from './auth/modules/user/entities/user.entity';
import { RoleService } from './auth/modules/role/role.service';
import { Repository } from 'typeorm';
import { RolesUserByAplicationService } from './auth/modules/roles-user-by-aplication/roles-user-by-aplication.service';
import { RolesUserByAplication } from './auth/modules/roles-user-by-aplication/entities/roles-user-by-aplication.entity';
import { HttpExceptionFilter } from './handlers/error.exception';

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
    ClarisaMeliaStudyTypeModule,
    UserModule,
    ComplementaryDataUserModule,
    RoleModule,
    RolesUserByAplicationModule,
    TypeOrmModule.forFeature([User, RolesUserByAplication]),
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
