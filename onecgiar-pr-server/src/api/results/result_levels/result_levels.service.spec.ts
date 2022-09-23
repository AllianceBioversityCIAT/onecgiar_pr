import { Test, TestingModule } from '@nestjs/testing';
import { ResultLevelsService } from './result_levels.service';

describe('ResultLevelsService', () => {
  let service: ResultLevelsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultLevelsService],
    }).compile();

    service = module.get<ResultLevelsService>(ResultLevelsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
