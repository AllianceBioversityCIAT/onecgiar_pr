import { Module } from '@nestjs/common';
import { ClarisaImpactAreaService } from './clarisa-impact-area.service';
import { ClarisaImpactAreaController } from './clarisa-impact-area.controller';

@Module({
  controllers: [ClarisaImpactAreaController],
  providers: [ClarisaImpactAreaService]
})
export class ClarisaImpactAreaModule {}
