import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';

import { VERSIONING } from '../../../shared/utils/versioning.utils';
import { GlobalParameter } from '../entities/global-parameter.entity';

@Injectable()
export class GlobalParameterRepository extends Repository<GlobalParameter> {
  private readonly _logger: Logger = new Logger(GlobalParameterRepository.name);

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(GlobalParameter, dataSource.createEntityManager());
  }
}
