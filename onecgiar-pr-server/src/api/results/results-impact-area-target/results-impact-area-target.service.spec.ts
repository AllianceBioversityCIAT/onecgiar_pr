import { Test, TestingModule } from '@nestjs/testing';
import { ResultsImpactAreaTargetService } from './results-impact-area-target.service';

describe('ResultsImpactAreaTargetService', () => {
  let service: ResultsImpactAreaTargetService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsImpactAreaTargetService],
    }).compile();

    service = module.get<ResultsImpactAreaTargetService>(
      ResultsImpactAreaTargetService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
