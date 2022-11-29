import { Module } from '@nestjs/common';
import { ClarisaActionAreaOutcomeService } from './clarisa-action-area-outcome.service';
import { ClarisaActionAreaOutcomeController } from './clarisa-action-area-outcome.controller';
import { ClarisaActionAreaOutcomeRepository } from './clarisa-action-area-outcome.repository';

@Module({
  controllers: [ClarisaActionAreaOutcomeController],
  providers: [ClarisaActionAreaOutcomeService, ClarisaActionAreaOutcomeRepository],
  exports: [
    ClarisaActionAreaOutcomeRepository
  ]
})
export class ClarisaActionAreaOutcomeModule {}
