import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { LegacyResult } from './entities/legacy-result.entity';

@Injectable()
export class ResultLegacyRepository extends Repository<LegacyResult> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(LegacyResult, dataSource.createEntityManager());
  }
}
