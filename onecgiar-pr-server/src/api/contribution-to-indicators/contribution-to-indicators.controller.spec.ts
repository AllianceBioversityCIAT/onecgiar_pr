import { Test, TestingModule } from '@nestjs/testing';
import { ContributionToIndicatorsController } from './contribution-to-indicators.controller';
import { ContributionToIndicatorsService } from './contribution-to-indicators.service';

describe('ContributionToIndicatorsController', () => {
  let controller: ContributionToIndicatorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContributionToIndicatorsController],
      providers: [ContributionToIndicatorsService],
    }).compile();

    controller = module.get<ContributionToIndicatorsController>(ContributionToIndicatorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
