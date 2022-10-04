import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { VersionsService } from './versions.service';
import { VersionsController } from './versions.controller';
import { VersionRepository } from './version.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { JwtMiddleware } from 'src/auth/Middlewares/jwt.middleware';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [VersionsController],
  providers: [
    VersionsService,
    VersionRepository,
    HandlersError
  ],
  exports:[
    VersionsService,
    VersionRepository
  ],
  imports: [AuthModule]
})
export class VersionsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes(
      {
        path: '/api/results/versions/all',
        method: RequestMethod.GET,
      }
    );
  }
}

