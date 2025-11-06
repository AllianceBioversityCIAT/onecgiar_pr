import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
  Global,
} from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserRepository } from './repositories/user.repository';
import { BcryptPasswordEncoder } from '../../../auth/utils/bcrypt.util';
import { Repository } from 'typeorm';
import { RoleModule } from '../role/role.module';
import { JwtMiddleware } from '../../../auth/Middlewares/jwt.middleware';
import { AuthService } from '../../auth.service';
import { JwtModule } from '@nestjs/jwt';
import { RoleByUserModule } from '../role-by-user/role-by-user.module';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { AuthMicroserviceModule } from '../../../shared/microservices/auth-microservice/auth-microservice.module';
import { PlatformReportModule } from '../../../api/platform-report/platform-report.module';
import { ActiveDirectoryService } from '../../services/active-directory.service';
import { EmailNotificationManagementModule } from '../../../shared/microservices/email-notification-management/email-notification-management.module';
import { ClarisaPortfoliosModule } from '../../../clarisa/clarisa-portfolios/clarisa-portfolios.module';
import { ClarisaInitiativesModule } from '../../../clarisa/clarisa-initiatives/clarisa-initiatives.module';
import { VersionRepository } from '../../../api/versioning/versioning.repository';
import { GlobalParameterRepository } from '../../../api/global-parameter/repositories/global-parameter.repository';

@Global()
@Module({
  controllers: [UserController],
  providers: [
    UserService,
    BcryptPasswordEncoder,
    Repository,
    UserRepository,
    AuthService,
    HandlersError,
    ReturnResponse,
    ActiveDirectoryService,
    VersionRepository,
    GlobalParameterRepository,
  ],
  imports: [
    UserModule,
    RoleModule,
    TypeOrmModule.forFeature([User]),
    JwtModule,
    RoleByUserModule,
    AuthMicroserviceModule,
    PlatformReportModule,
    EmailNotificationManagementModule,
    ClarisaPortfoliosModule,
    ClarisaInitiativesModule,
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
      },
      {
        path: '/auth/user/change/status',
        method: RequestMethod.PATCH,
      },
      {
        path: '/auth/user/update/roles',
        method: RequestMethod.PATCH,
      },
      {
        path: '/auth/user/find/role_by_entity',
        method: RequestMethod.GET,
      },
    );
  }
}
