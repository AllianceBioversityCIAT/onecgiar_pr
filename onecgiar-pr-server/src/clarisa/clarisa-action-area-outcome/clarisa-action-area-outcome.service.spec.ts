import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaActionAreaOutcomeService } from './clarisa-action-area-outcome.service';

describe('ClarisaActionAreaOutcomeService', () => {
  let service: ClarisaActionAreaOutcomeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaActionAreaOutcomeService],
    }).compile();

    service = module.get<ClarisaActionAreaOutcomeService>(ClarisaActionAreaOutcomeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
