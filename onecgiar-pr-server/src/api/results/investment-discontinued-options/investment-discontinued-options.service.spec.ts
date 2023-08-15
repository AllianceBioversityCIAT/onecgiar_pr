import { Test, TestingModule } from '@nestjs/testing';
import { InvestmentDiscontinuedOptionsService } from './investment-discontinued-options.service';

describe('InvestmentDiscontinuedOptionsService', () => {
  let service: InvestmentDiscontinuedOptionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InvestmentDiscontinuedOptionsService],
    }).compile();

    service = module.get<InvestmentDiscontinuedOptionsService>(InvestmentDiscontinuedOptionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
