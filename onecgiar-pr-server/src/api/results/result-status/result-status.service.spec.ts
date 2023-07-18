import { Test, TestingModule } from '@nestjs/testing';
import { ResultStatusService } from './result-status.service';

describe('ResultStatusService', () => {
  let service: ResultStatusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResultStatusService],
    }).compile();

    service = module.get<ResultStatusService>(ResultStatusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
