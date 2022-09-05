import { Module } from '@nestjs/common';
import { ClarisaActionAreasOutcomesIndicatorsService } from './clarisa-action-areas-outcomes-indicators.service';
import { ClarisaActionAreasOutcomesIndicatorsController } from './clarisa-action-areas-outcomes-indicators.controller';

@Module({
  controllers: [ClarisaActionAreasOutcomesIndicatorsController],
  providers: [ClarisaActionAreasOutcomesIndicatorsService]
})
export class ClarisaActionAreasOutcomesIndicatorsModule {}
