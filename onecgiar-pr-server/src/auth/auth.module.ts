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

@Module({
  controllers: [AuthController],
  imports: [
    PassportModule,
    JwtModule.register({
      secret: env.JWT_SKEY,
      signOptions: { expiresIn: env.JWT_EXPIRES },
    }),
    TypeOrmModule.forFeature([User, ComplementaryDataUser]),
  ],
  providers: [
    JwtStrategy,
    JwtService,
    BcryptPasswordEncoder,
    UserService,
    ComplementaryDataUserService,
    UserRepository,
    AuthService,
    JwtMiddleware,
    RoleService,
    Repository,
    RolesUserByAplicationService,
  ],
  exports: [BcryptPasswordEncoder, JwtMiddleware],
})
export class AuthModule {}
