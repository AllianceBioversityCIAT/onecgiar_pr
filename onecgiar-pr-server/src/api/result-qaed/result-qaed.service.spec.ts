import { Test, TestingModule } from '@nestjs/testing';
import { ResultQaedService } from './result-qaed.service';

describe('ResultQaedService', () => {
  let service: ResultQaedService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultQaedService],
    }).compile();

    service = module.get<ResultQaedService>(ResultQaedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
