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
import { ResultsTocSdgTargetRepository } from '../results-toc-results/result-toc-sdg-target-repository';
import { ResultsTocImpactAreaTargetRepository } from '../results-toc-results/result-toc-impact-area-repository';
import { ResultsSdgTargetRepository } from '../results-toc-results/results-sdg-targets.respository';
import { RoleByUserRepository } from '../../../auth/modules/role-by-user/RoleByUser.repository';
import { ResultsActionAreaOutcomeRepository } from '../results-toc-results/result-toc-action-area.repository';
import { ResultsTocTargetIndicatorRepository } from '../results-toc-results/result-toc-result-target-indicator.repository';
import { TemplateRepository } from '../../platform-report/repositories/template.repository';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { UserNotificationSettingRepository } from '../../user_notification_settings/user_notification_settings.repository';
import { ResultsTocResultsModule } from '../results-toc-results/results-toc-results.module';
import { EmailNotificationManagementModule } from '../../../shared/email-notification-management/email-notification-management.module';
import { GlobalParameterRepository } from '../../global-parameter/repositories/global-parameter.repository';

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
    ResultsTocResultIndicatorsRepository,
    ResultsTocSdgTargetRepository,
    ResultsTocImpactAreaTargetRepository,
    ResultsSdgTargetRepository,
    RoleByUserRepository,
    ResultsActionAreaOutcomeRepository,
    ResultsTocTargetIndicatorRepository,
    TemplateRepository,
    ClarisaInitiativesRepository,
    UserNotificationSettingRepository,
    GlobalParameterRepository,
  ],
  exports: [ShareResultRequestRepository, ShareResultRequestService],
  imports: [EmailNotificationManagementModule, ResultsTocResultsModule],
})
export class ShareResultRequestModule {}
