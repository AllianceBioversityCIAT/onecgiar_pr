import { Test, TestingModule } from '@nestjs/testing';
import { LegacyIndicatorsLocationsController } from './legacy_indicators_locations.controller';
import { LegacyIndicatorsLocationsService } from './legacy_indicators_locations.service';

describe('LegacyIndicatorsLocationsController', () => {
  let controller: LegacyIndicatorsLocationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LegacyIndicatorsLocationsController],
      providers: [LegacyIndicatorsLocationsService],
    }).compile();

    controller = module.get<LegacyIndicatorsLocationsController>(
      LegacyIndicatorsLocationsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
