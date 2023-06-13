import { Module } from '@nestjs/common';
import { ResultsTocResultsService } from './results-toc-results.service';
import { ResultsTocResultsController } from './results-toc-results.controller';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsTocResultRepository } from './results-toc-results.repository';
import { NonPooledProjectRepository } from '../non-pooled-projects/non-pooled-projects.repository';
import { ResultsCenterRepository } from '../results-centers/results-centers.repository';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { VersionsService } from '../versions/versions.service';
import { VersionRepository } from '../../versioning/versioning.repository';
import { UserRepository } from '../../../auth/modules/user/repositories/user.repository';
import { ResultRepository } from '../result.repository';
import { TocResultsRepository } from '../../../toc/toc-results/toc-results.repository';
import { ResultsImpactAreaTargetRepository } from '../results-impact-area-target/results-impact-area-target.repository';
import { ResultsImpactAreaIndicatorRepository } from '../results-impact-area-indicators/results-impact-area-indicators.repository';
import { ClarisaImpactAreaRepository } from '../../../clarisa/clarisa-impact-area/ClarisaImpactArea.repository';
import { ShareResultRequestService } from '../share-result-request/share-result-request.service';
import { ShareResultRequestRepository } from '../share-result-request/share-result-request.repository';
import { ResultInitiativeBudgetRepository } from '../result_budget/repositories/result_initiative_budget.repository';

@Module({
  controllers: [ResultsTocResultsController],
  providers: [
    ResultsTocResultsService,
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
    ResultsImpactAreaIndicatorRepository,
    ClarisaImpactAreaRepository,
    ShareResultRequestService,
    ShareResultRequestRepository,
    ResultInitiativeBudgetRepository,
  ],
  exports: [ResultsTocResultRepository],
})
export class ResultsTocResultsModule {}
