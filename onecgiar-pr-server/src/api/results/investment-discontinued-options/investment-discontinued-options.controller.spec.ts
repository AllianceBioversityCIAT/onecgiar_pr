import { Test, TestingModule } from '@nestjs/testing';
import { InvestmentDiscontinuedOptionsController } from './investment-discontinued-options.controller';
import { InvestmentDiscontinuedOptionsService } from './investment-discontinued-options.service';

describe('InvestmentDiscontinuedOptionsController', () => {
  let controller: InvestmentDiscontinuedOptionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvestmentDiscontinuedOptionsController],
      providers: [InvestmentDiscontinuedOptionsService],
    }).compile();

    controller = module.get<InvestmentDiscontinuedOptionsController>(InvestmentDiscontinuedOptionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
