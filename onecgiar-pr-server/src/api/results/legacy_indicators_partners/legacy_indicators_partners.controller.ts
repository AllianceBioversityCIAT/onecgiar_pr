import { Controller } from '@nestjs/common';
import { LegacyIndicatorsPartnersService } from './legacy_indicators_partners.service';

@Controller('legacy-indicators-partners')
export class LegacyIndicatorsPartnersController {
  constructor(
    private readonly legacyIndicatorsPartnersService: LegacyIndicatorsPartnersService,
  ) {}
}
