import { Module } from '@nestjs/common';
import { ClarisaImpactAreaIndicatorsService } from './clarisa-impact-area-indicators.service';
import { ClarisaImpactAreaIndicatorsController } from './clarisa-impact-area-indicators.controller';
import { RouterModule } from '@nestjs/core';
import { ClarisaImpactAreaIndicatorsRoutes } from './clarisaImpactAreaIndicators.routes';
import { ClarisaImpactAreaInticatorsRepository } from './ClarisaImpactAreaIndicators.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Module({
  controllers: [ClarisaImpactAreaIndicatorsController],
  providers: [
    ClarisaImpactAreaIndicatorsService,
    ClarisaImpactAreaInticatorsRepository,
    HandlersError,
  ],
  imports: [RouterModule.register(ClarisaImpactAreaIndicatorsRoutes)],
  exports: [ClarisaImpactAreaInticatorsRepository],
})
export class ClarisaImpactAreaIndicatorsModule {}
