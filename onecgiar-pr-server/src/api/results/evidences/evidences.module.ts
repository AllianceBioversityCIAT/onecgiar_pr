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
import { ResultRepository } from '../result.repository';
import { VersionRepository } from '../../versioning/versioning.repository';
import { ResultsKnowledgeProductsRepository } from '../results-knowledge-products/repositories/results-knowledge-products.repository';
import { ResultsInnovationsDevRepository } from '../summary/repositories/results-innovations-dev.repository';
import { SharePointModule } from '../../../shared/services/share-point/share-point.module';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';

@Module({
  controllers: [EvidencesController],
  providers: [
    EvidencesService,
    EvidencesRepository,
    HandlersError,
    ResultRepository,
    VersionRepository,
    ResultsKnowledgeProductsRepository,
    ReturnResponse,
    ResultsInnovationsDevRepository,
  ],
  imports: [AuthModule, SharePointModule],
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
