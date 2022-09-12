import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaActionAreasOutcomesIndicatorsService } from './clarisa-action-areas-outcomes-indicators.service';

describe('ClarisaActionAreasOutcomesIndicatorsService', () => {
  let service: ClarisaActionAreasOutcomesIndicatorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaActionAreasOutcomesIndicatorsService],
    }).compile();

    service = module.get<ClarisaActionAreasOutcomesIndicatorsService>(
      ClarisaActionAreasOutcomesIndicatorsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
