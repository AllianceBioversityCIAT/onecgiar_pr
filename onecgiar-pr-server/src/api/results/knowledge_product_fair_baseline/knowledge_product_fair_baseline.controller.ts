import { Controller } from '@nestjs/common';
import { KnowledgeProductFairBaselineService } from './knowledge_product_fair_baseline.service';

@Controller('knowledge-product-fair-baseline')
export class KnowledgeProductFairBaselineController {
  constructor(
    private readonly knowledgeProductFairBaselineService: KnowledgeProductFairBaselineService,
  ) {}
}
