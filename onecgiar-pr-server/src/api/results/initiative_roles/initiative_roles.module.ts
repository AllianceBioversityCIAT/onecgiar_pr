import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { InitiativeRolesService } from './initiative_roles.service';
import { InitiativeRolesController } from './initiative_roles.controller';
import { JwtMiddleware } from '../../../auth/Middlewares/jwt.middleware';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [InitiativeRolesController],
  providers: [InitiativeRolesService],
  imports: [AuthModule]
})
export class InitiativeRolesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes(
      {
        path: '/api/result/initiative-roles/all',
        method: RequestMethod.GET,
      }
    );
  }
}
