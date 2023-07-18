import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { InstitutionRolesService } from './institution_roles.service';
import { InstitutionRolesController } from './institution_roles.controller';
import { JwtMiddleware } from '../../../auth/Middlewares/jwt.middleware';
import { AuthModule } from '../../../auth/auth.module';
import { ReturnResponse } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [InstitutionRolesController],
  providers: [InstitutionRolesService, ReturnResponse],
  imports: [AuthModule],
})
export class InstitutionRolesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes({
      path: '/api/results/institution-roles/all',
      method: RequestMethod.GET,
    });
  }
}
