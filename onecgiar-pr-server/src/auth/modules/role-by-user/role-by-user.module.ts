import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtMiddleware } from '../../Middlewares/jwt.middleware';
import { RoleByUserService } from './role-by-user.service';
import { RoleByUserController } from './role-by-user.controller';
import { RoleByUserRepository } from './RoleByUser.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { RoleLevelsModule } from '../role-levels/role-levels.module';
import { UserRepository } from '../user/repositories/user.repository';

@Module({
  controllers: [RoleByUserController],
  imports: [RoleLevelsModule, JwtModule],
  providers: [
    RoleByUserService,
    RoleByUserRepository,
    HandlersError,
    UserRepository,
  ],
  exports: [RoleByUserRepository],
})
export class RoleByUserModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes(
      {
        path: '/auth/role-by-user',
        method: RequestMethod.POST,
      },
      {
        path: '/auth/role-by-user/get/user/:id',
        method: RequestMethod.GET,
      },
    );
  }
}
