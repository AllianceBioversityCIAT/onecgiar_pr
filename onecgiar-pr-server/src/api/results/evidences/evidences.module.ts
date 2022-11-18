import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { EvidencesService } from './evidences.service';
import { EvidencesController } from './evidences.controller';
import { AuthModule } from '../../../auth/auth.module';
import { JwtMiddleware } from '../../../auth/Middlewares/jwt.middleware';
import { EvidencesRepository } from './evidences.repository';
import { HandlersError } from 'src/shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';
import { VersionRepository } from '../versions/version.repository';
import { ResultsKnowledgeProductsRepository } from '../results-knowledge-products/repositories/results-knowledge-products.repository';

@Module({
  controllers: [EvidencesController],
  providers: [
    EvidencesService,
    EvidencesRepository,
    HandlersError,
    ResultRepository,
    VersionRepository,
    ResultsKnowledgeProductsRepository,
  ],
  imports: [AuthModule],
  exports: [EvidencesRepository],
})
export class EvidencesModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes({
      path: '/api/result/evidence/all',
      method: RequestMethod.GET,
    });
  }
}
