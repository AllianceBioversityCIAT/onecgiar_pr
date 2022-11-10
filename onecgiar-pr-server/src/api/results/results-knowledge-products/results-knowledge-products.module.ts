import { Module } from '@nestjs/common';
import { ResultsKnowledgeProductsService } from './results-knowledge-products.service';
import { ResultsKnowledgeProductsController } from './results-knowledge-products.controller';
import { ResultsKnowledgeProductsRepository } from './repositories/results-knowledge-products.repository';
import { ResultRepository } from '../result.repository';
import { MQAPService } from '../../m-qap/m-qap.service';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { HttpModule } from '@nestjs/axios';
import { VersionRepository } from '../versions/version.repository';
import { ResultsKnowledgeProductMapper } from './results-knowledge-products.mapper';
import { ResultsKnowledgeProductAltmetricRepository } from './repositories/results-knowledge-product-altmetrics.repository';
import { ResultsKnowledgeProductAuthorRepository } from './repositories/results-knowledge-product-authors.repository';
import { ResultsKnowledgeProductInstitutionRepository } from './repositories/results-knowledge-product-institution.repository';
import { ResultsKnowledgeProductKeywordRepository } from './repositories/results-knowledge-product-keywords.repository';
import { ResultsKnowledgeProductMetadataRepository } from './repositories/results-knowledge-product-metadata.repository';

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
    ResultsKnowledgeProductAltmetricRepository,
    ResultsKnowledgeProductAuthorRepository,
    ResultsKnowledgeProductInstitutionRepository,
    ResultsKnowledgeProductKeywordRepository,
    ResultsKnowledgeProductMetadataRepository,
  ],
})
export class ResultsKnowledgeProductsModule {}
