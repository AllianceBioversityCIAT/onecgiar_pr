import { Module } from '@nestjs/common';
import { ResultsKnowledgeProductsService } from './results-knowledge-products.service';
import { ResultsKnowledgeProductsController } from './results-knowledge-products.controller';

@Module({
  controllers: [ResultsKnowledgeProductsController],
  providers: [ResultsKnowledgeProductsService]
})
export class ResultsKnowledgeProductsModule {}
