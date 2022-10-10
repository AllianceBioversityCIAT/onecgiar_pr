import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ResultsByEvidencesService } from './results_by_evidences.service';
import { ResultsByEvidencesController } from './results_by_evidences.controller';
import { JwtMiddleware } from '../../../auth/Middlewares/jwt.middleware';
import { AuthModule } from '../../../auth/auth.module';
import { ResultByEvidencesRepository } from './result_by_evidences.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultsByEvidencesController],
  providers: [
    ResultsByEvidencesService,
    ResultByEvidencesRepository,
    HandlersError
  ],
  imports: [AuthModule],
  exports: [
    ResultByEvidencesRepository
  ]
})
export class ResultsByEvidencesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes(
      {
        path: '/api/result/result-by-evidences/all',
        method: RequestMethod.GET,
      }
    );
  }
}

