import { Module } from '@nestjs/common';
import { ClarisaInnovationUseLevelsService } from './clarisa-innovation-use-levels.service';
import { ClarisaInnovationUseLevelsController } from './clarisa-innovation-use-levels.controller';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaInnovationUseLevelRepository } from './clarisa-innovation-use-levels.repository';

@Module({
  controllers: [ClarisaInnovationUseLevelsController],
  providers: [
    ClarisaInnovationUseLevelsService,
    HandlersError,
    ClarisaInnovationUseLevelRepository,
  ],
  exports: [ClarisaInnovationUseLevelRepository],
})
export class ClarisaInnovationUseLevelsModule {}
