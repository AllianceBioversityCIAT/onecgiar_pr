import { Test, TestingModule } from '@nestjs/testing';
import { ResultsComplementaryInnovationsService } from './results-complementary-innovations.service';

describe('ResultsComplementaryInnovationsService', () => {
  let service: ResultsComplementaryInnovationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsComplementaryInnovationsService],
    }).compile();

    service = module.get<ResultsComplementaryInnovationsService>(
      ResultsComplementaryInnovationsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
