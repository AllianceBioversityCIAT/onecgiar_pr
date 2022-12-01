import { Module } from '@nestjs/common';
import { KnowledgeProductFairBaselineService } from './knowledge_product_fair_baseline.service';
import { KnowledgeProductFairBaselineController } from './knowledge_product_fair_baseline.controller';

@Module({
  controllers: [KnowledgeProductFairBaselineController],
  providers: [KnowledgeProductFairBaselineService]
})
export class KnowledgeProductFairBaselineModule {}
