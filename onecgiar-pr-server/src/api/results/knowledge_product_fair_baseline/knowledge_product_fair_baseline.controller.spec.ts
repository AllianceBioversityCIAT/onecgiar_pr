import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeProductFairBaselineController } from './knowledge_product_fair_baseline.controller';
import { KnowledgeProductFairBaselineService } from './knowledge_product_fair_baseline.service';

describe('KnowledgeProductFairBaselineController', () => {
  let controller: KnowledgeProductFairBaselineController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeProductFairBaselineController],
      providers: [KnowledgeProductFairBaselineService],
    }).compile();

    controller = module.get<KnowledgeProductFairBaselineController>(
      KnowledgeProductFairBaselineController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
