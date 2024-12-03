import { Module } from '@nestjs/common';
import { ContributionToIndicatorsService } from './contribution-to-indicators.service';
import { ContributionToIndicatorsController } from './contribution-to-indicators.controller';
import { ContributionToIndicatorsRepository } from './repositories/contribution-to-indicators.repository';
import { ContributionToIndicatorResultsRepository } from './repositories/contribution-to-indicator-result.repository';
import { HandlersError } from '../../shared/handlers/error.utils';
import { UserRepository } from '../../auth/modules/user/repositories/user.repository';
import { ContributionToIndicatorSubmissionRepository } from './repositories/contribution-to-indicator-result-submission.repository';

@Module({
  controllers: [ContributionToIndicatorsController],
  providers: [
    ContributionToIndicatorsService,
    ContributionToIndicatorsRepository,
    ContributionToIndicatorResultsRepository,
    HandlersError,
    UserRepository,
    ContributionToIndicatorSubmissionRepository,
  ],
})
export class ContributionToIndicatorsModule {}
