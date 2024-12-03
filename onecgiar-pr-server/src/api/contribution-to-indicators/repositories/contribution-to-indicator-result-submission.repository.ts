import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ContributionToIndicatorSubmission } from '../entities/contribution-to-indicator-submission.entity';

@Injectable()
export class ContributionToIndicatorSubmissionRepository extends Repository<ContributionToIndicatorSubmission> {
  private readonly _logger: Logger = new Logger(
    ContributionToIndicatorSubmissionRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ContributionToIndicatorSubmission, dataSource.createEntityManager());
  }
}
