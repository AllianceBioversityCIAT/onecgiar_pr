import { Test, TestingModule } from '@nestjs/testing';
import { LegacyIndicatorsPartnersController } from './legacy_indicators_partners.controller';
import { LegacyIndicatorsPartnersService } from './legacy_indicators_partners.service';

describe('LegacyIndicatorsPartnersController', () => {
  let controller: LegacyIndicatorsPartnersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LegacyIndicatorsPartnersController],
      providers: [LegacyIndicatorsPartnersService],
    }).compile();

    controller = module.get<LegacyIndicatorsPartnersController>(
      LegacyIndicatorsPartnersController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
