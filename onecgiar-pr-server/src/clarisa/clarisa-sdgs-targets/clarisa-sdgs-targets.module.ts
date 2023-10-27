import { Module } from '@nestjs/common';
import { ClarisaSdgsTargetsService } from './clarisa-sdgs-targets.service';
import { ClarisaSdgsTargetsController } from './clarisa-sdgs-targets.controller';
import { ClarisaSdgsTargetsRepository } from './clarisa-sdgs-targets.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Module({
  controllers: [ClarisaSdgsTargetsController],
  providers: [
    ClarisaSdgsTargetsService,
    ClarisaSdgsTargetsRepository,
    HandlersError,
  ],
  exports: [ClarisaSdgsTargetsRepository],
})
export class ClarisaSdgsTargetsModule {}
