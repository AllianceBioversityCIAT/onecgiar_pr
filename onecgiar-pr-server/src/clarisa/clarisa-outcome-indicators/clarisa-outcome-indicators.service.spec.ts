import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaOutcomeIndicatorsService } from './clarisa-outcome-indicators.service';

describe('ClarisaOutcomeIndicatorsService', () => {
  let service: ClarisaOutcomeIndicatorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaOutcomeIndicatorsService],
    }).compile();

    service = module.get<ClarisaOutcomeIndicatorsService>(
      ClarisaOutcomeIndicatorsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
