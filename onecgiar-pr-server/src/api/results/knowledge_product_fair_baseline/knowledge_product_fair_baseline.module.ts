import { Module } from '@nestjs/common';
import { KnowledgeProductFairBaselineService } from './knowledge_product_fair_baseline.service';
import { KnowledgeProductFairBaselineController } from './knowledge_product_fair_baseline.controller';
import { KnowledgeProductFairBaselineRepository } from './knowledge_product_fair_baseline.repository';
import { ReturnResponse } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [KnowledgeProductFairBaselineController],
  providers: [
    KnowledgeProductFairBaselineService,
    KnowledgeProductFairBaselineRepository,
    ReturnResponse,
  ],
  exports: [KnowledgeProductFairBaselineRepository],
})
export class KnowledgeProductFairBaselineModule {}
