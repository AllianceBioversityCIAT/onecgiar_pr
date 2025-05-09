import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { env } from 'process';
import { BcryptPasswordEncoder } from './utils/bcrypt.util';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './modules/user/entities/user.entity';
import { JwtMiddleware } from './Middlewares/jwt.middleware';
import { Repository } from 'typeorm';
import { RoleModule } from './modules/role/role.module';
import { UserModule } from './modules/user/user.module';
import { RoleByUserModule } from './modules/role-by-user/role-by-user.module';
import { RoleLevelsModule } from './modules/role-levels/role-levels.module';
import { HandlersError } from '../shared/handlers/error.utils';
import { RestrictionsByRoleModule } from './modules/restrictions-by-role/restrictions-by-role.module';
import { RestrictionsModule } from './modules/restrictions/restrictions.module';
import { CognitoStrategy } from '../shared/AWS/cognito/cognito.strategy';
import { HttpModule, HttpService } from '@nestjs/axios';

@Module({
  controllers: [AuthController],
  imports: [
    PassportModule,
    RoleModule,
    UserModule,
    HttpModule,
    JwtModule.register({
      secret: env.JWT_SKEY,
      signOptions: { expiresIn: env.JWT_EXPIRES },
    }),
    TypeOrmModule.forFeature([User]),
    RoleByUserModule,
    RoleLevelsModule,
    RestrictionsByRoleModule,
    RestrictionsModule,
  ],
  providers: [
    CognitoStrategy,
    AuthService,
    // JwtStrategy,
    JwtService,
    BcryptPasswordEncoder,
    JwtMiddleware,
    Repository,
    HandlersError,
  ],
  exports: [BcryptPasswordEncoder, JwtMiddleware, AuthService, JwtService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes({
      path: '/auth/signing/pusher/result/:resultId/:user',
      method: RequestMethod.POST,
    });
  }
}
