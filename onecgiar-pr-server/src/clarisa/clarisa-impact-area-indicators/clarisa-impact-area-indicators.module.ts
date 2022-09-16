import { Module } from '@nestjs/common';
import { ClarisaImpactAreaIndicatorsService } from './clarisa-impact-area-indicators.service';
import { ClarisaImpactAreaIndicatorsController } from './clarisa-impact-area-indicators.controller';
import { RouterModule } from '@nestjs/core';
import { ClarisaImpactAreaIndicatorsRoutes } from './clarisaImpactAreaIndicators.routes';

@Module({
  controllers: [ClarisaImpactAreaIndicatorsController],
  providers: [ClarisaImpactAreaIndicatorsService],
  imports: [RouterModule.register(ClarisaImpactAreaIndicatorsRoutes)],
})
export class ClarisaImpactAreaIndicatorsModule {}
