import { Module } from '@nestjs/common';
import { ResultsTocResultsService } from './results-toc-results.service';
import { ResultsTocResultsController } from './results-toc-results.controller';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
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
import { ResultsTocResultIndicatorsRepository } from './repositories/results-toc-results-indicators.repository';
import { ResultsTocSdgTargetRepository } from './repositories/result-toc-sdg-target-repository';
import { ResultsTocImpactAreaTargetRepository } from './repositories/result-toc-impact-area-repository';
import { ResultsSdgTargetRepository } from './repositories/results-sdg-targets.respository';
import { NonPooledProjectBudgetRepository } from '../result_budget/repositories/non_pooled_proyect_budget.repository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { ResultsActionAreaOutcomeRepository } from './repositories/result-toc-action-area.repository';
import { ResultsTocTargetIndicatorRepository } from './repositories/result-toc-result-target-indicator.repository';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { ResultsTocResultIndicatorsService } from './results-toc-result-indicators.service';
import { TemplateRepository } from '../../platform-report/repositories/template.repository';
import { UserNotificationSettingRepository } from '../../user_notification_settings/user_notification_settings.repository';
import { EmailNotificationManagementModule } from '../../../shared/email-notification-management/email-notification-management.module';

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
    ReturnResponse,
    ResultsTocResultIndicatorsRepository,
    ResultsTocSdgTargetRepository,
    ResultsTocImpactAreaTargetRepository,
    ResultsSdgTargetRepository,
    RoleByUserRepository,
    ResultsSdgTargetRepository,
    NonPooledProjectBudgetRepository,
    ResultsActionAreaOutcomeRepository,
    ResultsActionAreaOutcomeRepository,
    ResultsTocTargetIndicatorRepository,
    ClarisaInitiativesRepository,
    ResultsTocResultIndicatorsService,
    TemplateRepository,
    UserNotificationSettingRepository,
  ],
  exports: [ResultsTocResultRepository, ResultsTocResultsService],
  imports: [EmailNotificationManagementModule],
})
export class ResultsTocResultsModule {}
