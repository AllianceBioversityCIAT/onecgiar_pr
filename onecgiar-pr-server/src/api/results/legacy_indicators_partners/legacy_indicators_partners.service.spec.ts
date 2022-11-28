import { Test, TestingModule } from '@nestjs/testing';
import { LegacyIndicatorsPartnersService } from './legacy_indicators_partners.service';

describe('LegacyIndicatorsPartnersService', () => {
  let service: LegacyIndicatorsPartnersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LegacyIndicatorsPartnersService],
    }).compile();

    service = module.get<LegacyIndicatorsPartnersService>(LegacyIndicatorsPartnersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
