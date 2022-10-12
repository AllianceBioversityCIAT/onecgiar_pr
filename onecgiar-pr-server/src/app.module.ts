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
import { AuthService } from './auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { UserService } from './auth/modules/user/user.service';
import { UserRepository } from './auth/modules/user/repositories/user.repository';
import { User } from './auth/modules/user/entities/user.entity';
import { RoleService } from './auth/modules/role/role.service';
import { Repository } from 'typeorm';
import { HttpExceptionFilter } from './shared/handlers/error.exception';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ClarisaModule,
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
    ClarisaModule,
    UserModule,
    RoleModule,
    TypeOrmModule.forFeature([User]),
    ScheduleModule.forRoot(),
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
