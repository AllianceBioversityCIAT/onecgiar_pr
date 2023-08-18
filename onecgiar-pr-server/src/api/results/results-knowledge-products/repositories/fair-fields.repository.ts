import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { FairField } from '../entities/fair-fields.entity';

@Injectable()
export class FairFieldRepository extends Repository<FairField> {
  private readonly _logger: Logger = new Logger(FairField.name);

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(FairField, dataSource.createEntityManager());
  }
}
