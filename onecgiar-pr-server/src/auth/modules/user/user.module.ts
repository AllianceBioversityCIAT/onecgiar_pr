import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { RouterModule } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { BcryptPasswordEncoder } from '../../../auth/utils/bcrypt.util';
import { RoleService } from '../role/role.service';
import { Role } from '../role/entities/role.entity';
import { Repository } from 'typeorm';
import { RoleModule } from '../role/role.module';
import { JwtMiddleware } from '../../../auth/Middlewares/jwt.middleware';
import { AuthModule } from '../../auth.module';
import { AuthService } from '../../auth.service';
import { JwtModule } from '@nestjs/jwt';
import { RoleByUserModule } from '../role-by-user/role-by-user.module';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [UserController],
  providers: [
    UserService, 
    BcryptPasswordEncoder, 
    Repository, 
    UserRepository,
    AuthService,
    HandlersError
  ],
  imports: [
    UserModule,
    RoleModule,
    TypeOrmModule.forFeature([User]),
    JwtModule,
    RoleByUserModule
  ],
  exports: [UserRepository, UserService, TypeOrmModule.forFeature([User])],
})
export class UserModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes(
      {
        path: '/auth/user/all',
        method: RequestMethod.GET,
      },
      {
        path: '/auth/user/all/full',
        method: RequestMethod.GET,
      },
      {
        path: '/auth/user/create',
        method: RequestMethod.POST,
      }
    );
  }
}
