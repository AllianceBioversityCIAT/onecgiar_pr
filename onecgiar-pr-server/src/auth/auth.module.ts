import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RouterModule } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { env } from 'process';
import { BcryptPasswordEncoder } from './utils/bcrypt.util';
import { TypeOrmModule } from '@nestjs/typeorm';
import ActiveDirectory from 'activedirectory';
import { User } from './modules/user/entities/user.entity';
import { ComplementaryDataUser } from './modules/complementary-data-user/entities/complementary-data-user.entity';
import { UserService } from './modules/user/user.service';
import { ComplementaryDataUserService } from './modules/complementary-data-user/complementary-data-user.service';
import { UserRepository } from './modules/user/repositories/user.repository';
import { JwtMiddleware } from './Middlewares/jwt.middleware';
import { RoleService } from './modules/role/role.service';
import { Repository } from 'typeorm';
import { RolesUserByAplicationService } from './modules/roles-user-by-aplication/roles-user-by-aplication.service';
import { RolesUserByAplication } from './modules/roles-user-by-aplication/entities/roles-user-by-aplication.entity';
import { RoleModule } from './modules/role/role.module';
import { RolesUserByAplicationModule } from './modules/roles-user-by-aplication/roles-user-by-aplication.module';
import { UserModule } from './modules/user/user.module';
import { ComplementaryDataUserModule } from './modules/complementary-data-user/complementary-data-user.module';
import { ActionsModule } from './modules/actions/actions.module';
import { PermissionByRoleModule } from './modules/permission-by-role/permission-by-role.module';

@Module({
  controllers: [AuthController],
  imports: [
    PassportModule,
    RoleModule,
    RolesUserByAplicationModule,
    UserModule,
    ComplementaryDataUserModule,
    JwtModule.register({
      secret: env.JWT_SKEY,
      signOptions: { expiresIn: env.JWT_EXPIRES },
    }),
    TypeOrmModule.forFeature([
      User,
      ComplementaryDataUser,
      RolesUserByAplication,
    ]),
    ActionsModule,
    PermissionByRoleModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    JwtService,
    BcryptPasswordEncoder,
    JwtMiddleware,
    Repository,
  ],
  exports: [BcryptPasswordEncoder, JwtMiddleware, AuthService],
})
export class AuthModule {}
