import { Test, TestingModule } from '@nestjs/testing';
import { LinkedResultsService } from './linked-results.service';

describe('LinkedResultsService', () => {
  let service: LinkedResultsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LinkedResultsService],
    }).compile();

    service = module.get<LinkedResultsService>(LinkedResultsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
