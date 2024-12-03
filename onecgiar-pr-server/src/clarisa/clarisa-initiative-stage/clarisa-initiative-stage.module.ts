import { Module } from '@nestjs/common';
import { ClarisaInitiativeStageService } from './clarisa-initiative-stage.service';
import { ClarisaInitiativeStageController } from './clarisa-initiative-stage.controller';
import { ClarisaInitiativeStageRepository } from './repositories/clarisa-initiative-stage.repository';
import { HandlersError } from '../../shared/handlers/error.utils';

@Module({
  controllers: [ClarisaInitiativeStageController],
  providers: [
    ClarisaInitiativeStageService,
    ClarisaInitiativeStageRepository,
    HandlersError,
  ],
  exports: [ClarisaInitiativeStageRepository],
})
export class ClarisaInitiativeStageModule {}
