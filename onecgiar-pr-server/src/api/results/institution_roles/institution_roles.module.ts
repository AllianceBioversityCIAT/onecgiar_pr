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

@Module({
  controllers: [InstitutionRolesController],
  providers: [InstitutionRolesService],
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
