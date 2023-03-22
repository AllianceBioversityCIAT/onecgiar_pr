import { Module } from '@nestjs/common';
import { ClarisaSdgsTargetsService } from './clarisa-sdgs-targets.service';
import { ClarisaSdgsTargetsController } from './clarisa-sdgs-targets.controller';
import { ClarisaSdgsTargetsRepository } from './clarisa-sdgs-targets.repository';

@Module({
  controllers: [ClarisaSdgsTargetsController],
  providers: [
    ClarisaSdgsTargetsService,
    ClarisaSdgsTargetsRepository
  ],
  exports: [ClarisaSdgsTargetsRepository]
})
export class ClarisaSdgsTargetsModule {}
