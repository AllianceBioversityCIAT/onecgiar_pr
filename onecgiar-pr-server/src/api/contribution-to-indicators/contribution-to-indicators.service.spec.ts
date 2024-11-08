import { Test, TestingModule } from '@nestjs/testing';
import { ContributionToIndicatorsService } from './contribution-to-indicators.service';

describe('ContributionToIndicatorsService', () => {
  let service: ContributionToIndicatorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContributionToIndicatorsService],
    }).compile();

    service = module.get<ContributionToIndicatorsService>(ContributionToIndicatorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
