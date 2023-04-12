import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { RegionalLeadership } from '../entities/regional-leadership.entity';

@Injectable()
export class RegionalLeadershipRepository extends Repository<RegionalLeadership> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(RegionalLeadership, dataSource.createEntityManager());
  }
}
