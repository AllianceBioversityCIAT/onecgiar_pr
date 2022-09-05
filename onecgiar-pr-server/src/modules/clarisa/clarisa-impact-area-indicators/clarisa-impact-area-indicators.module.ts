import { Module } from '@nestjs/common';
import { ClarisaImpactAreaIndicatorsService } from './clarisa-impact-area-indicators.service';
import { ClarisaImpactAreaIndicatorsController } from './clarisa-impact-area-indicators.controller';

@Module({
  controllers: [ClarisaImpactAreaIndicatorsController],
  providers: [ClarisaImpactAreaIndicatorsService]
})
export class ClarisaImpactAreaIndicatorsModule {}
