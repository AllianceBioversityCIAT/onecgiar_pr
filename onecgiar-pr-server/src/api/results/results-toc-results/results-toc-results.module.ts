import { Module } from '@nestjs/common';
import { ResultsTocResultsService } from './results-toc-results.service';
import { ResultsTocResultsController } from './results-toc-results.controller';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsTocResultRepository } from './results-toc-results.repository';
import { NonPooledProjectRepository } from '../non-pooled-projects/non-pooled-projects.repository';
import { ResultsCenterRepository } from '../results-centers/results-centers.repository';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { VersionsService } from '../versions/versions.service';
import { VersionRepository } from '../versions/version.repository';

@Module({
  controllers: [ResultsTocResultsController],
  providers: [ResultsTocResultsService, HandlersError, ResultsTocResultRepository, NonPooledProjectRepository, ResultsCenterRepository, ResultByInitiativesRepository, VersionsService, VersionRepository],
  exports: [
    ResultsTocResultRepository
  ]
})
export class ResultsTocResultsModule {}
