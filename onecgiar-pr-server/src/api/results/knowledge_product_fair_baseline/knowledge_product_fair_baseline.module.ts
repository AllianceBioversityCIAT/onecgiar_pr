import { Module } from '@nestjs/common';
import { KnowledgeProductFairBaselineService } from './knowledge_product_fair_baseline.service';
import { KnowledgeProductFairBaselineController } from './knowledge_product_fair_baseline.controller';
import { KnowledgeProductFairBaselineRepository } from './knowledge_product_fair_baseline.repository';

@Module({
  controllers: [KnowledgeProductFairBaselineController],
  providers: [
    KnowledgeProductFairBaselineService,
    KnowledgeProductFairBaselineRepository,
  ],
  exports: [KnowledgeProductFairBaselineRepository],
})
export class KnowledgeProductFairBaselineModule {}
