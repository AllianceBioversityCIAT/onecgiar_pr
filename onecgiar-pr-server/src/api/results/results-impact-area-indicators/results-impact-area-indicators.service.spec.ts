import { Test, TestingModule } from '@nestjs/testing';
import { ResultsImpactAreaIndicatorsService } from './results-impact-area-indicators.service';

describe('ResultsImpactAreaIndicatorsService', () => {
  let service: ResultsImpactAreaIndicatorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsImpactAreaIndicatorsService],
    }).compile();

    service = module.get<ResultsImpactAreaIndicatorsService>(ResultsImpactAreaIndicatorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
