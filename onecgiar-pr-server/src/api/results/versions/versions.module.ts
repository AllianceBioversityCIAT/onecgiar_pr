import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { VersionsService } from './versions.service';
import { VersionsController } from './versions.controller';
import { VersionRepository } from '../../versioning/versioning.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { AuthModule } from '../../../auth/auth.module';
import { JwtMiddleware } from '../../../auth/Middlewares/jwt.middleware';

@Module({
  controllers: [VersionsController],
  providers: [
    VersionsService,
    VersionRepository,
    HandlersError,
    ReturnResponse,
  ],
  exports: [VersionsService, VersionRepository],
  imports: [AuthModule],
})
export class VersionsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes({
      path: '/api/results/versions/all',
      method: RequestMethod.GET,
    });
  }
}
