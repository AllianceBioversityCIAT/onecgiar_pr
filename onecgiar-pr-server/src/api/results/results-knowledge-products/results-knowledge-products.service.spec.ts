import { Test, TestingModule } from '@nestjs/testing';
import { ResultsKnowledgeProductsService } from './results-knowledge-products.service';

describe('ResultsKnowledgeProductsService', () => {
  let service: ResultsKnowledgeProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsKnowledgeProductsService],
    }).compile();

    service = module.get<ResultsKnowledgeProductsService>(
      ResultsKnowledgeProductsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
