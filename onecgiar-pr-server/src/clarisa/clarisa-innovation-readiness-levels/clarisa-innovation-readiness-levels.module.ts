import { Module } from '@nestjs/common';
import { ClarisaInnovationReadinessLevelsService } from './clarisa-innovation-readiness-levels.service';
import { ClarisaInnovationReadinessLevelsController } from './clarisa-innovation-readiness-levels.controller';
import { ClarisaInnovationReadinessLevelRepository } from './clarisa-innovation-readiness-levels.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Module({
  controllers: [ClarisaInnovationReadinessLevelsController],
  providers: [
    ClarisaInnovationReadinessLevelsService,
    ClarisaInnovationReadinessLevelRepository,
    HandlersError,
  ],
  exports: [ClarisaInnovationReadinessLevelRepository],
})
export class ClarisaInnovationReadinessLevelsModule {}
