import { Module } from '@nestjs/common';
import { ClarisaOutcomeIndicatorsService } from './clarisa-outcome-indicators.service';
import { ClarisaOutcomeIndicatorsController } from './clarisa-outcome-indicators.controller';
import { ClarisaOutcomeIndicatorsRepository } from './ClariasaOutcomeIndicators.repository';

@Module({
  controllers: [ClarisaOutcomeIndicatorsController],
  providers: [
    ClarisaOutcomeIndicatorsService,
    ClarisaOutcomeIndicatorsRepository
  ],
  exports: [
    ClarisaOutcomeIndicatorsRepository
  ]
})
export class ClarisaOutcomeIndicatorsModule {}
