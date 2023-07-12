import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { YearsService } from './years.service';
import { YearsController } from './years.controller';
import { JwtMiddleware } from '../../../auth/Middlewares/jwt.middleware';
import { AuthModule } from '../../../auth/auth.module';
import { YearRepository } from './year.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { ResponseInterceptor } from '../../../shared/Interceptors/Return-data.interceptor';

@Module({
  controllers: [YearsController],
  providers: [
    YearsService,
    ResponseInterceptor,
    YearRepository,
    HandlersError,
    RoleByUserRepository,
    ReturnResponse,
  ],
  imports: [AuthModule],
  exports: [YearRepository],
})
export class YearsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes({
      path: '/api/results/years/all',
      method: RequestMethod.GET,
    });
  }
}
