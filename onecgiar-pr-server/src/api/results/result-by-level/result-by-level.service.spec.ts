import { Test, TestingModule } from '@nestjs/testing';
import { ResultByLevelService } from './result-by-level.service';

describe('ResultByLevelService', () => {
  let service: ResultByLevelService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultByLevelService],
    }).compile();

    service = module.get<ResultByLevelService>(ResultByLevelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
