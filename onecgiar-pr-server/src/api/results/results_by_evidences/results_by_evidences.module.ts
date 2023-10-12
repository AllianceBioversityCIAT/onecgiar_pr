import { Module } from '@nestjs/common';
import { ResultsByEvidencesService } from './results_by_evidences.service';
import { ResultsByEvidencesController } from './results_by_evidences.controller';
import { ResultByEvidencesRepository } from './result_by_evidences.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultsByEvidencesController],
  providers: [
    ResultsByEvidencesService,
    ResultByEvidencesRepository,
    HandlersError,
  ],
  imports: [],
  exports: [ResultByEvidencesRepository],
})
export class ResultsByEvidencesModule {}
