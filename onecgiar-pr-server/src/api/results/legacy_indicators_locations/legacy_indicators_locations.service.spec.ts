import { Test, TestingModule } from '@nestjs/testing';
import { LegacyIndicatorsLocationsService } from './legacy_indicators_locations.service';

describe('LegacyIndicatorsLocationsService', () => {
  let service: LegacyIndicatorsLocationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LegacyIndicatorsLocationsService],
    }).compile();

    service = module.get<LegacyIndicatorsLocationsService>(
      LegacyIndicatorsLocationsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
