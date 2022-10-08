import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { Year } from './entities/year.entity';

@Injectable()
export class YearRepository extends Repository<Year> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError
    ) {
    super(Year, dataSource.createEntityManager());
  }

}
