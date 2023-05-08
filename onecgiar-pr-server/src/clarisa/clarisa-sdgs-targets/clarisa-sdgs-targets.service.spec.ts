import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaSdgsTargetsService } from './clarisa-sdgs-targets.service';

describe('ClarisaSdgsTargetsService', () => {
  let service: ClarisaSdgsTargetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaSdgsTargetsService],
    }).compile();

    service = module.get<ClarisaSdgsTargetsService>(ClarisaSdgsTargetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
