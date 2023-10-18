import { Controller } from '@nestjs/common';
import { LegacyIndicatorsLocationsService } from './legacy_indicators_locations.service';

@Controller('legacy-indicators-locations')
export class LegacyIndicatorsLocationsController {
  constructor(
    private readonly legacyIndicatorsLocationsService: LegacyIndicatorsLocationsService,
  ) {}
}
