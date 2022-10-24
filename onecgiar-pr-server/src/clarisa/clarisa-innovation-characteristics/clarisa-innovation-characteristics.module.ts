import { Module } from '@nestjs/common';
import { ClarisaInnovationCharacteristicsService } from './clarisa-innovation-characteristics.service';
import { ClarisaInnovationCharacteristicsController } from './clarisa-innovation-characteristics.controller';
import { ClarisaInnovationCharacteristicRepository } from './clarisa-innovation-characteristics.repository';

@Module({
  controllers: [ClarisaInnovationCharacteristicsController],
  providers: [
    ClarisaInnovationCharacteristicsService,
    ClarisaInnovationCharacteristicRepository
  ],
  exports: [
    ClarisaInnovationCharacteristicRepository
  ]
})
export class ClarisaInnovationCharacteristicsModule {}
