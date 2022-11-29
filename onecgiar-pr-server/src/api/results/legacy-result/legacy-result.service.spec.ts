import { Test, TestingModule } from '@nestjs/testing';
import { LegacyResultService } from './legacy-result.service';

describe('LegacyResultService', () => {
  let service: LegacyResultService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LegacyResultService],
    }).compile();

    service = module.get<LegacyResultService>(LegacyResultService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
