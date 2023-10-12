import { Test, TestingModule } from '@nestjs/testing';
import { ResultsComplementaryInnovationsFunctionsService } from './results-complementary-innovations-functions.service';

describe('ResultsComplementaryInnovationsFunctionsService', () => {
  let service: ResultsComplementaryInnovationsFunctionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsComplementaryInnovationsFunctionsService],
    }).compile();

    service = module.get<ResultsComplementaryInnovationsFunctionsService>(
      ResultsComplementaryInnovationsFunctionsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
