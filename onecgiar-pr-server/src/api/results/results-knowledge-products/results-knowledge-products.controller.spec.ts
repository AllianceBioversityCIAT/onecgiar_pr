import { Test, TestingModule } from '@nestjs/testing';
import { ResultsKnowledgeProductsController } from './results-knowledge-products.controller';
import { ResultsKnowledgeProductsService } from './results-knowledge-products.service';

describe('ResultsKnowledgeProductsController', () => {
  let controller: ResultsKnowledgeProductsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsKnowledgeProductsController],
      providers: [ResultsKnowledgeProductsService],
    }).compile();

    controller = module.get<ResultsKnowledgeProductsController>(ResultsKnowledgeProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
