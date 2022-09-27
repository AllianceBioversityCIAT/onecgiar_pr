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
import { UserService } from './modules/user/user.service';
import { UserRepository } from './modules/user/repositories/user.repository';
import { JwtMiddleware } from './Middlewares/jwt.middleware';
import { RoleService } from './modules/role/role.service';
import { Repository } from 'typeorm';
import { RoleModule } from './modules/role/role.module';
import { UserModule } from './modules/user/user.module';
import { ActionsModule } from './modules/actions/actions.module';
import { PermissionByRoleModule } from './modules/permission-by-role/permission-by-role.module';
import { RoleByUserModule } from './modules/role-by-user/role-by-user.module';
import { RoleLevelsModule } from './modules/role-levels/role-levels.module';

@Module({
  controllers: [AuthController],
  imports: [
    PassportModule,
    RoleModule,
    UserModule,
    JwtModule.register({
      secret: env.JWT_SKEY,
      signOptions: { expiresIn: env.JWT_EXPIRES },
    }),
    TypeOrmModule.forFeature([
      User
    ]),
    ActionsModule,
    PermissionByRoleModule,
    RoleByUserModule,
    RoleLevelsModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    JwtService,
    BcryptPasswordEncoder,
    JwtMiddleware,
    Repository,
  ],
  exports: [
    BcryptPasswordEncoder, 
    JwtMiddleware, 
    AuthService,
    JwtService
  ],
})
export class AuthModule {}
