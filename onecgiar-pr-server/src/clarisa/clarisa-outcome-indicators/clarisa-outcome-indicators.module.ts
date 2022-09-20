import { Module } from '@nestjs/common';
import { ClarisaOutcomeIndicatorsService } from './clarisa-outcome-indicators.service';
import { ClarisaOutcomeIndicatorsController } from './clarisa-outcome-indicators.controller';

@Module({
  controllers: [ClarisaOutcomeIndicatorsController],
  providers: [ClarisaOutcomeIndicatorsService]
})
export class ClarisaOutcomeIndicatorsModule {}
