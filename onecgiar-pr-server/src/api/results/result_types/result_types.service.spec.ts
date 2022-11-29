import { Test, TestingModule } from '@nestjs/testing';
import { ResultTypesService } from './result_types.service';

describe('ResultTypesService', () => {
  let service: ResultTypesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultTypesService],
    }).compile();

    service = module.get<ResultTypesService>(ResultTypesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
