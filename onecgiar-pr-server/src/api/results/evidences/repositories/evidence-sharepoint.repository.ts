import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

import { EvidenceSharepoint } from '../entities/evidence-sharepoint.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';

@Injectable()
export class EvidenceSharepointRepository extends Repository<EvidenceSharepoint> {
  private readonly _logger: Logger = new Logger(
    EvidenceSharepointRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(EvidenceSharepoint, dataSource.createEntityManager());
  }
}
