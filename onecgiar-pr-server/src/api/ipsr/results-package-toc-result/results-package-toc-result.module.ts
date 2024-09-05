import { Module } from '@nestjs/common';
import { ResultsPackageTocResultService } from './results-package-toc-result.service';
import { ResultsPackageTocResultController } from './results-package-toc-result.controller';
import {
  HandlersError,
  ReturnResponse,
} from '../../../shared/handlers/error.utils';
import { ResultRepository } from '../../results/result.repository';
import { VersionsService } from '../../results/versions/versions.service';
import { VersionRepository } from '../../versioning/versioning.repository';
import { IpsrRepository } from '../repository/ipsr.repository';
import { ResultsCenterRepository } from '../../results/results-centers/results-centers.repository';
import { ResultByInitiativesRepository } from '../../results/results_by_inititiatives/resultByInitiatives.repository';
import { ResultsTocResultRepository } from '../../results/results-toc-results/results-toc-results.repository';
import { ShareResultRequestService } from '../../results/share-result-request/share-result-request.service';
import { ShareResultRequestRepository } from '../../results/share-result-request/share-result-request.repository';
import { NonPooledProjectRepository } from '../../results/non-pooled-projects/non-pooled-projects.repository';
import { ResultByIntitutionsRepository } from '../../results/results_by_institutions/result_by_intitutions.repository';
import { ResultByInstitutionsByDeliveriesTypeRepository } from '../../results/result-by-institutions-by-deliveries-type/result-by-institutions-by-deliveries-type.repository';
import { ResultInitiativeBudgetRepository } from '../../results/result_budget/repositories/result_initiative_budget.repository';
import { ResultIpEoiOutcomeRepository } from '../innovation-pathway/repository/result-ip-eoi-outcomes.repository';
import { VersioningModule } from '../../versioning/versioning.module';
import { ResultsTocResultIndicatorsRepository } from 'src/api/results/results-toc-results/repositories/results-toc-results-indicators.repository';
import { ResultsTocSdgTargetRepository } from 'src/api/results/results-toc-results/repositories/result-toc-sdg-target-repository';
import { ResultsTocImpactAreaTargetRepository } from 'src/api/results/results-toc-results/repositories/result-toc-impact-area-repository';
import { ResultsSdgTargetRepository } from 'src/api/results/results-toc-results/repositories/results-sdg-targets.respository';
import { ResultsActionAreaOutcomeRepository } from 'src/api/results/results-toc-results/repositories/result-toc-action-area.repository';
import { ResultsTocTargetIndicatorRepository } from 'src/api/results/results-toc-results/repositories/result-toc-result-target-indicator.repository';
import { ResultsTocResultsModule } from '../../results/results-toc-results/results-toc-results.module';
import { ResultsTocResultIndicatorsService } from '../../results/results-toc-results/results-toc-result-indicators.service';
import { ClarisaInitiativesRepository } from '../../../clarisa/clarisa-initiatives/ClarisaInitiatives.repository';
import { TemplateRepository } from '../../platform-report/repositories/template.repository';
import { UserNotificationSettingRepository } from '../../user_notification_settings/user_notification_settings.repository';
import { EmailNotificationManagementModule } from '../../../shared/email-notification-management/email-notification-management.module';
import { GlobalParameterRepository } from '../../global-parameter/repositories/global-parameter.repository';

@Module({
  controllers: [ResultsPackageTocResultController],
  imports: [
    VersioningModule,
    ResultsTocResultsModule,
    EmailNotificationManagementModule,
  ],
  providers: [
    ResultsPackageTocResultService,
    ResultRepository,
    VersionsService,
    ResultsTocResultIndicatorsService,
    VersionRepository,
    IpsrRepository,
    ResultsCenterRepository,
    ResultByInitiativesRepository,
    ResultsTocResultRepository,
    ShareResultRequestService,
    ShareResultRequestRepository,
    NonPooledProjectRepository,
    ResultByIntitutionsRepository,
    ResultByInstitutionsByDeliveriesTypeRepository,
    HandlersError,
    ResultInitiativeBudgetRepository,
    ResultIpEoiOutcomeRepository,
    ReturnResponse,
    ResultsTocResultIndicatorsRepository,
    ResultsTocSdgTargetRepository,
    ResultsTocImpactAreaTargetRepository,
    ResultsSdgTargetRepository,
    ResultsActionAreaOutcomeRepository,
    ResultsTocTargetIndicatorRepository,
    ClarisaInitiativesRepository,
    TemplateRepository,
    UserNotificationSettingRepository,
    GlobalParameterRepository,
  ],
  exports: [ResultsPackageTocResultService],
})
export class ResultsPackageTocResultModule {}
