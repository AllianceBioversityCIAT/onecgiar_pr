import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ResultsByInititiativesService } from './results_by_inititiatives.service';
import { ResultsByInititiativesController } from './results_by_inititiatives.controller';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultByInitiativesRepository } from './resultByInitiatives.repository';
import { JwtMiddleware } from '../../../auth/Middlewares/jwt.middleware';
import { AuthModule } from '../../../auth/auth.module';

@Module({
  controllers: [ResultsByInititiativesController],
  providers: [
    ResultsByInititiativesService,
    ResultByInitiativesRepository,
    HandlersError
  ],
  exports: [
    ResultsByInititiativesService,
    ResultByInitiativesRepository
  ],
  imports: [AuthModule]
})
export class ResultsByInititiativesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes(
      {
        path: '/api/results/results-by-initiatives/all',
        method: RequestMethod.GET,
      }
    );
  }
}

