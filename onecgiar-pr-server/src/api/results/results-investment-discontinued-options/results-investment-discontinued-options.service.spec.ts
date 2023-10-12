import { Test, TestingModule } from '@nestjs/testing';
import { ResultsInvestmentDiscontinuedOptionsService } from './results-investment-discontinued-options.service';

describe('ResultsInvestmentDiscontinuedOptionsService', () => {
  let service: ResultsInvestmentDiscontinuedOptionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsInvestmentDiscontinuedOptionsService],
    }).compile();

    service = module.get<ResultsInvestmentDiscontinuedOptionsService>(
      ResultsInvestmentDiscontinuedOptionsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
