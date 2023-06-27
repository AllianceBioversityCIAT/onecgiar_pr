import { Module } from '@nestjs/common';
import { LegacyIndicatorsLocationsService } from './legacy_indicators_locations.service';
import { LegacyIndicatorsLocationsController } from './legacy_indicators_locations.controller';
import { ReturnResponse } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [LegacyIndicatorsLocationsController],
  providers: [LegacyIndicatorsLocationsService, ReturnResponse],
})
export class LegacyIndicatorsLocationsModule {}
