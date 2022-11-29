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
import { UserRepository } from '../../../auth/modules/user/repositories/user.repository';
import { ResultRepository } from '../result.repository';
import { TocResultsRepository } from '../../../toc/toc-results/toc-results.repository';
import { ResultsImpactAreaTargetRepository } from '../results-impact-area-target/results-impact-area-target.repository';
import { ResultsImpactAreaIndicatorRepository } from '../results-impact-area-indicators/results-impact-area-indicators.repository';

@Module({
  controllers: [ResultsTocResultsController],
  providers: [ResultsTocResultsService,
    HandlersError,
    ResultsTocResultRepository,
    NonPooledProjectRepository,
    ResultsCenterRepository,
    ResultByInitiativesRepository,
    VersionsService,
    VersionRepository,
    UserRepository,
    ResultRepository,
    TocResultsRepository,
    ResultsImpactAreaTargetRepository,
    ResultsImpactAreaIndicatorRepository
  ],
  exports: [
    ResultsTocResultRepository
  ]
})
export class ResultsTocResultsModule {}
