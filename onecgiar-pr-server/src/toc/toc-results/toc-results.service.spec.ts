import { Test, TestingModule } from '@nestjs/testing';
import { TocResultsService } from './toc-results.service';

describe('TocResultsService', () => {
  let service: TocResultsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TocResultsService],
    }).compile();

    service = module.get<TocResultsService>(TocResultsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
