import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { RouterModule } from '@nestjs/core';
import { ComplementaryDataUserService } from '../complementary-data-user/complementary-data-user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ComplementaryDataUser } from '../complementary-data-user/entities/complementary-data-user.entity';
import { UserRepository } from './repositories/user.repository';
import { BcryptPasswordEncoder } from '../../../auth/utils/bcrypt.util';
import { RoleService } from '../role/role.service';
import { Role } from '../role/entities/role.entity';
import { Repository } from 'typeorm';
import { RolesUserByAplicationService } from '../roles-user-by-aplication/roles-user-by-aplication.service';
import { RolesUserByAplication } from '../roles-user-by-aplication/entities/roles-user-by-aplication.entity';
import { RoleModule } from '../role/role.module';
import { RolesUserByAplicationModule } from '../roles-user-by-aplication/roles-user-by-aplication.module';
import { ComplementaryDataUserModule } from '../complementary-data-user/complementary-data-user.module';
import { JwtMiddleware } from '../../../auth/Middlewares/jwt.middleware';
import { AuthModule } from '../../auth.module';
import { AuthService } from '../../auth.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  controllers: [UserController],
  providers: [
    UserService, 
    BcryptPasswordEncoder, 
    Repository, 
    UserRepository,
    AuthService
  ],
  imports: [
    UserModule,
    RoleModule,
    RolesUserByAplicationModule,
    ComplementaryDataUserModule,
    TypeOrmModule.forFeature([User]),
    JwtModule
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
