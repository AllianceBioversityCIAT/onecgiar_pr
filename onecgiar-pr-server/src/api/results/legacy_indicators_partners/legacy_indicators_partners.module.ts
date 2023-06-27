import { Module } from '@nestjs/common';
import { LegacyIndicatorsPartnersService } from './legacy_indicators_partners.service';
import { LegacyIndicatorsPartnersController } from './legacy_indicators_partners.controller';
import { ReturnResponse } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [LegacyIndicatorsPartnersController],
  providers: [LegacyIndicatorsPartnersService, ReturnResponse],
})
export class LegacyIndicatorsPartnersModule {}
