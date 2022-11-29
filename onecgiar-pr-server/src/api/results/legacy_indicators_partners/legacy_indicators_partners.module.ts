import { Module } from '@nestjs/common';
import { LegacyIndicatorsPartnersService } from './legacy_indicators_partners.service';
import { LegacyIndicatorsPartnersController } from './legacy_indicators_partners.controller';

@Module({
  controllers: [LegacyIndicatorsPartnersController],
  providers: [LegacyIndicatorsPartnersService]
})
export class LegacyIndicatorsPartnersModule {}
