import { Module } from '@nestjs/common';
import { ResultsByEvidencesService } from './results_by_evidences.service';
import { ResultsByEvidencesController } from './results_by_evidences.controller';

@Module({
  controllers: [ResultsByEvidencesController],
  providers: [ResultsByEvidencesService]
})
export class ResultsByEvidencesModule {}
