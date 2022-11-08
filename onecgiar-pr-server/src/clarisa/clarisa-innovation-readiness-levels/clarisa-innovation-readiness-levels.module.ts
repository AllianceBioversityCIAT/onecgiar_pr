import { Module } from '@nestjs/common';
import { ClarisaInnovationReadinessLevelsService } from './clarisa-innovation-readiness-levels.service';
import { ClarisaInnovationReadinessLevelsController } from './clarisa-innovation-readiness-levels.controller';
import { ClarisaInnovationReadinessLevelRepository } from './clarisa-innovation-readiness-levels.repository';

@Module({
  controllers: [ClarisaInnovationReadinessLevelsController],
  providers: [
    ClarisaInnovationReadinessLevelsService,
    ClarisaInnovationReadinessLevelRepository
  ],
  exports: [
    ClarisaInnovationReadinessLevelRepository
  ]
})
export class ClarisaInnovationReadinessLevelsModule {}
