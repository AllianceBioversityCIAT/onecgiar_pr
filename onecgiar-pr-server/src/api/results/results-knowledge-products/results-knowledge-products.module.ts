import { Module } from '@nestjs/common';
import { ResultsKnowledgeProductsService } from './results-knowledge-products.service';
import { ResultsKnowledgeProductsController } from './results-knowledge-products.controller';
import { ResultsKnowledgeProductsRepository } from './results-knowledge-products.repository';
import { ResultRepository } from '../result.repository';
import { MQAPService } from '../../m-qap/m-qap.service';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { HttpModule } from '@nestjs/axios';
import { VersionRepository } from '../versions/version.repository';
import { ResultsKnowledgeProductMapper } from './results-knowledge-products.mapper';

@Module({
  imports: [HttpModule],
  controllers: [ResultsKnowledgeProductsController],
  providers: [
    ResultsKnowledgeProductsService,
    HandlersError,
    ResultsKnowledgeProductsRepository,
    ResultRepository,
    MQAPService,
    VersionRepository,
    ResultsKnowledgeProductMapper,
  ],
})
export class ResultsKnowledgeProductsModule {}
