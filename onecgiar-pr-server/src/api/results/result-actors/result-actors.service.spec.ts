import { Test, TestingModule } from '@nestjs/testing';
import { ResultActorsService } from './result-actors.service';

describe('ResultActorsService', () => {
  let service: ResultActorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultActorsService],
    }).compile();

    service = module.get<ResultActorsService>(ResultActorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
