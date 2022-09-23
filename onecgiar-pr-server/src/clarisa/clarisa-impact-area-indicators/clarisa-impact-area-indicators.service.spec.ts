import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaImpactAreaIndicatorsService } from './clarisa-impact-area-indicators.service';

describe('ClarisaImpactAreaIndicatorsService', () => {
  let service: ClarisaImpactAreaIndicatorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaImpactAreaIndicatorsService],
    }).compile();

    service = module.get<ClarisaImpactAreaIndicatorsService>(
      ClarisaImpactAreaIndicatorsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
