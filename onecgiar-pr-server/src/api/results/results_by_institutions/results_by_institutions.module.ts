import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ResultsByInstitutionsService } from './results_by_institutions.service';
import { ResultsByInstitutionsController } from './results_by_institutions.controller';
import { JwtMiddleware } from '../../../auth/Middlewares/jwt.middleware';
import { AuthModule } from '../../../auth/auth.module';
import { ResultByIntitutionsRepository } from './result_by_intitutions.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultsByInstitutionsController],
  providers: [
    ResultsByInstitutionsService,
    ResultByIntitutionsRepository,
    HandlersError
  ],
  imports: [AuthModule],
  exports: [
    ResultByIntitutionsRepository
  ]
})
export class ResultsByInstitutionsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes(
      {
        path: '/api/results/results-by-institutions/all',
        method: RequestMethod.GET,
      }
    );
  }
}

