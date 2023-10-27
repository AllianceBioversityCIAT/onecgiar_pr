import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { UnitTime } from '../entities/unit-time.entity';

@Injectable()
export class UnitTimeRepository extends Repository<UnitTime> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(UnitTime, dataSource.createEntityManager());
  }
}
