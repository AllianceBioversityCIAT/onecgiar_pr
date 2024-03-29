import { Module } from '@nestjs/common';
import { ClarisaImpactAreaService } from './clarisa-impact-area.service';
import { ClarisaImpactAreaController } from './clarisa-impact-area.controller';
import { RouterModule } from '@nestjs/core';
import { ClarisaImpactAreaRoutes } from './clarisaImpactArea.routes';
import { ClarisaImpactAreaRepository } from './ClarisaImpactArea.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Module({
  controllers: [ClarisaImpactAreaController],
  providers: [
    ClarisaImpactAreaService,
    ClarisaImpactAreaRepository,
    HandlersError,
  ],
  imports: [RouterModule.register(ClarisaImpactAreaRoutes)],
  exports: [ClarisaImpactAreaRepository],
})
export class ClarisaImpactAreaModule {}
