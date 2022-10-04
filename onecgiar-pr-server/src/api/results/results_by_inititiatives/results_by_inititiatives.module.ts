import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ResultsByInititiativesService } from './results_by_inititiatives.service';
import { ResultsByInititiativesController } from './results_by_inititiatives.controller';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultByInitiativesRepository } from './resultByInitiatives.repository';
import { JwtMiddleware } from '../../../auth/Middlewares/jwt.middleware';
import { AuthModule } from '../../../auth/auth.module';
import { ResultsModule } from '../results.module';
import { ResultsService } from '../results.service';
import { ResultRepository } from '../result.repository';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { ResultTypesService } from '../result_types/result_types.service';
import { VersionsService } from '../versions/versions.service';
import { ResultTypeRepository } from '../result_types/resultType.repository';

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
  imports: [
    AuthModule
  ]
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

