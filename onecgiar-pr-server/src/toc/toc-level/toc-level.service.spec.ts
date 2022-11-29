import { Test, TestingModule } from '@nestjs/testing';
import { TocLevelService } from './toc-level.service';

describe('TocLevelService', () => {
  let service: TocLevelService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TocLevelService],
    }).compile();

    service = module.get<TocLevelService>(TocLevelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
