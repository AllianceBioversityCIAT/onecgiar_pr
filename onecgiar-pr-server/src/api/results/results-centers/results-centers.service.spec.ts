import { Test, TestingModule } from '@nestjs/testing';
import { ResultsCentersService } from './results-centers.service';

describe('ResultsCentersService', () => {
  let service: ResultsCentersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultsCentersService],
    }).compile();

    service = module.get<ResultsCentersService>(ResultsCentersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
