import { Injectable, Logger } from '@nestjs/common';
import { ContributionToIndicator } from '../entities/contribution-to-indicator.entity';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class ContributionToIndicatorsRepository extends Repository<ContributionToIndicator> {
  private readonly _logger: Logger = new Logger(
    ContributionToIndicatorsRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ContributionToIndicator, dataSource.createEntityManager());
  }
}
