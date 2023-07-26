import { Module } from '@nestjs/common';
import { ShareResultRequestService } from './share-result-request.service';
import { ShareResultRequestController } from './share-result-request.controller';
import { ShareResultRequestRepository } from './share-result-request.repository';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../result.repository';
import { ResultByInitiativesRepository } from '../results_by_inititiatives/resultByInitiatives.repository';
import { VersionsService } from '../versions/versions.service';
import { VersionRepository } from '../../versioning/versioning.repository';
import { ResultsTocResultRepository } from '../results-toc-results/results-toc-results.repository';
import { ResultInitiativeBudgetRepository } from '../result_budget/repositories/result_initiative_budget.repository';
import { ResultsTocResultIndicatorsRepository } from '../results-toc-results/results-toc-results-indicators.repository';

@Module({
  controllers: [ShareResultRequestController],
  providers: [
    ShareResultRequestService,
    ShareResultRequestRepository,
    HandlersError,
    ResultRepository,
    ResultByInitiativesRepository,
    VersionsService,
    VersionRepository,
    ResultsTocResultRepository,
    ResultInitiativeBudgetRepository,
    ReturnResponse,
    ResultsTocResultIndicatorsRepository
  ],
  exports: [ShareResultRequestRepository],
})
export class ShareResultRequestModule {}
