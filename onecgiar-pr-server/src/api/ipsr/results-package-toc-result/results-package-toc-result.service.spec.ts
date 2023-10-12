import { Test, TestingModule } from '@nestjs/testing';
import { ResultsPackageTocResultService } from './results-package-toc-result.service';

describe('ResultsPackageTocResultService', () => {
  let service: ResultsPackageTocResultService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsPackageTocResultService],
    }).compile();

    service = module.get<ResultsPackageTocResultService>(
      ResultsPackageTocResultService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
