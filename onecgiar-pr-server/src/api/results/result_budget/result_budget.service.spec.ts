import { Test, TestingModule } from '@nestjs/testing';
import { ResultBudgetService } from './result_budget.service';

describe('ResultBudgetService', () => {
  let service: ResultBudgetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultBudgetService],
    }).compile();

    service = module.get<ResultBudgetService>(ResultBudgetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
