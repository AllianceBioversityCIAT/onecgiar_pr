import { Module } from '@nestjs/common';
import { ClarisaActionAreaOutcomeService } from './clarisa-action-area-outcome.service';
import { ClarisaActionAreaOutcomeController } from './clarisa-action-area-outcome.controller';
import { ClarisaActionAreaOutcomeRepository } from './clarisa-action-area-outcome.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Module({
  controllers: [ClarisaActionAreaOutcomeController],
  providers: [
    ClarisaActionAreaOutcomeService,
    ClarisaActionAreaOutcomeRepository,
    HandlersError,
  ],
  exports: [ClarisaActionAreaOutcomeRepository],
})
export class ClarisaActionAreaOutcomeModule {}
