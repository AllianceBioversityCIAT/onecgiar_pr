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
import { AuthMicroserviceModule } from '../shared/microservices/auth-microservice/auth-microservice.module';
import { ActiveDirectoryService } from './services/active-directory.service';
import { SearchThrottleMiddleware } from './Middlewares/search-throttle.middleware';
import { UserRepository } from './modules/user/repositories/user.repository';
import { GlobalParameterCacheModule } from '../shared/services/cache/global-parameter-cache.module';
import { OtpThrottlerGuard } from './guards/otp-throttler.guard';
// @akili-spec changes/cognito-email-otp-login (OTP-T-16, design.md §19.1) —
// AuthService now depends on OtpChallengeService (challenge lifecycle) and
// EmailNotificationManagementService (the code email); both must resolve inside
// AuthModule's own DI context, exactly like the GlobalParameterCacheModule fix
// above (OTP-T-4) — AuthModule instantiates AuthService directly.
import { OtpChallenge } from './otp/otp-challenge.entity';
import { OtpChallengeService } from './otp/otp-challenge.service';
import { EmailNotificationManagementModule } from '../shared/microservices/email-notification-management/email-notification-management.module';

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
    TypeOrmModule.forFeature([User, OtpChallenge]),
    RoleByUserModule,
    RoleLevelsModule,
    RestrictionsByRoleModule,
    RestrictionsModule,
    AuthMicroserviceModule,
    GlobalParameterCacheModule,
    EmailNotificationManagementModule,
  ],
  providers: [
    AuthService,
    ActiveDirectoryService,
    SearchThrottleMiddleware,
    JwtStrategy,
    JwtService,
    BcryptPasswordEncoder,
    JwtMiddleware,
    Repository,
    HandlersError,
    UserRepository,
    OtpThrottlerGuard,
    OtpChallengeService,
  ],
  exports: [
    BcryptPasswordEncoder,
    JwtMiddleware,
    AuthService,
    JwtService,
    ActiveDirectoryService,
  ],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtMiddleware)
      .forRoutes({
        path: '/auth/signing/pusher/result/:resultId/:user',
        method: RequestMethod.POST,
      })
      .apply(SearchThrottleMiddleware)
      .forRoutes({
        path: '/auth/users/search',
        method: RequestMethod.GET,
      });
  }
}
