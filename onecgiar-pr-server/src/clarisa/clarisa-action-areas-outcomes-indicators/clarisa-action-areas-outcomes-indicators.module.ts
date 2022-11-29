import { Module } from '@nestjs/common';
import { ClarisaActionAreasOutcomesIndicatorsService } from './clarisa-action-areas-outcomes-indicators.service';
import { ClarisaActionAreasOutcomesIndicatorsController } from './clarisa-action-areas-outcomes-indicators.controller';
import { RouterModule } from '@nestjs/core';
import { ClarisaActionAreasOutcomesIndicatorsRoutes } from './clarisaActionAreaOutcomesIndicators.routes';

@Module({
  controllers: [ClarisaActionAreasOutcomesIndicatorsController],
  providers: [ClarisaActionAreasOutcomesIndicatorsService],
  imports: [RouterModule.register(ClarisaActionAreasOutcomesIndicatorsRoutes)],
})
export class ClarisaActionAreasOutcomesIndicatorsModule {}
