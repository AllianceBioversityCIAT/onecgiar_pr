import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeProductFairBaselineService } from './knowledge_product_fair_baseline.service';

describe('KnowledgeProductFairBaselineService', () => {
  let service: KnowledgeProductFairBaselineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KnowledgeProductFairBaselineService],
    }).compile();

    service = module.get<KnowledgeProductFairBaselineService>(KnowledgeProductFairBaselineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
