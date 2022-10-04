import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ResultLevelsService } from './result_levels.service';
import { ResultLevelsController } from './result_levels.controller';
import { ResultLevelRepository } from './resultLevel.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultTypesModule } from '../result_types/result_types.module';
import { JwtMiddleware } from '../../../auth/Middlewares/jwt.middleware';
import { AuthModule } from '../../../auth/auth.module';

@Module({
  controllers: [ResultLevelsController],
  imports: [
    ResultTypesModule,
    AuthModule
  ],
  providers: [
    ResultLevelsService,
    ResultLevelRepository,
    HandlersError
  ],
  exports: [
    ResultLevelRepository,
    ResultLevelsService
  ]
})
export class ResultLevelsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes(
      {
        path: '/api/results/result-levels/all',
        method: RequestMethod.GET,
      }
    );
  }
}
