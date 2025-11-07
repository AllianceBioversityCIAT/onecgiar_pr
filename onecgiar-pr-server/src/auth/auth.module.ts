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
    TypeOrmModule.forFeature([User]),
    RoleByUserModule,
    RoleLevelsModule,
    RestrictionsByRoleModule,
    RestrictionsModule,
    AuthMicroserviceModule,
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
