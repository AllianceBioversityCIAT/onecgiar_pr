import { Test, TestingModule } from '@nestjs/testing';
import { ResultBudgetController } from './result_budget.controller';
import { ResultBudgetService } from './result_budget.service';

describe('ResultBudgetController', () => {
  let controller: ResultBudgetController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultBudgetController],
      providers: [ResultBudgetService],
    }).compile();

    controller = module.get<ResultBudgetController>(ResultBudgetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
