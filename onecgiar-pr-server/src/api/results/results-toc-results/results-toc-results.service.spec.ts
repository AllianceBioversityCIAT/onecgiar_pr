import { Test, TestingModule } from '@nestjs/testing';
import { ResultsTocResultsService } from './results-toc-results.service';

describe('ResultsTocResultsService', () => {
  let service: ResultsTocResultsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsTocResultsService],
    }).compile();

    service = module.get<ResultsTocResultsService>(ResultsTocResultsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
