import { Module } from '@nestjs/common';
import { ResultsImpactAreaTargetService } from './results-impact-area-target.service';
import { ResultsImpactAreaTargetController } from './results-impact-area-target.controller';
import { ResultsImpactAreaTargetRepository } from './results-impact-area-target.repository';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Module({
  controllers: [ResultsImpactAreaTargetController],
  providers: [
    ResultsImpactAreaTargetService,
    ResultsImpactAreaTargetRepository,
    HandlersError,
  ],
  exports: [ResultsImpactAreaTargetRepository],
})
export class ResultsImpactAreaTargetModule {}
