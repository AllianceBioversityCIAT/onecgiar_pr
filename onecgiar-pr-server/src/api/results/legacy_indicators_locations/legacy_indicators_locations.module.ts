import { Module } from '@nestjs/common';
import { LegacyIndicatorsLocationsService } from './legacy_indicators_locations.service';
import { LegacyIndicatorsLocationsController } from './legacy_indicators_locations.controller';

@Module({
  controllers: [LegacyIndicatorsLocationsController],
  providers: [LegacyIndicatorsLocationsService]
})
export class LegacyIndicatorsLocationsModule {}
