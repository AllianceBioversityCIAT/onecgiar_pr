import { Test, TestingModule } from '@nestjs/testing';
import { ResultsInvestmentDiscontinuedOptionsController } from './results-investment-discontinued-options.controller';
import { ResultsInvestmentDiscontinuedOptionsService } from './results-investment-discontinued-options.service';

describe('ResultsInvestmentDiscontinuedOptionsController', () => {
  let controller: ResultsInvestmentDiscontinuedOptionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsInvestmentDiscontinuedOptionsController],
      providers: [ResultsInvestmentDiscontinuedOptionsService],
    }).compile();

    controller = module.get<ResultsInvestmentDiscontinuedOptionsController>(ResultsInvestmentDiscontinuedOptionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
