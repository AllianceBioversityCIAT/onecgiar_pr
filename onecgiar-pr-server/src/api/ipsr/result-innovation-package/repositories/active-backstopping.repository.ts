import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ActiveBackstopping } from '../entities/active-backstopping.entity';

@Injectable()
export class ActiveBackstoppingRepository extends Repository<ActiveBackstopping> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ActiveBackstopping, dataSource.createEntityManager());
  }
}
