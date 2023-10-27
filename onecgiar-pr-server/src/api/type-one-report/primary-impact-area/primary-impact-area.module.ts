import { Module } from '@nestjs/common';
import { PrimaryImpactAreaService } from './primary-impact-area.service';
import { PrimaryImpactAreaController } from './primary-impact-area.controller';
import { PrimaryImpactAreaRepository } from './primary-impact-area.repository';
import { HandlersError } from 'src/shared/handlers/error.utils';

@Module({
  controllers: [PrimaryImpactAreaController],
  providers: [
    PrimaryImpactAreaService,
    PrimaryImpactAreaRepository,
    HandlersError,
  ],
  exports: [PrimaryImpactAreaRepository],
})
export class PrimaryImpactAreaModule {}
