import { Module } from '@nestjs/common';
import { PrimaryImpactAreaService } from './primary-impact-area.service';
import { PrimaryImpactAreaController } from './primary-impact-area.controller';

@Module({
  controllers: [PrimaryImpactAreaController],
  providers: [PrimaryImpactAreaService]
})
export class PrimaryImpactAreaModule {}
