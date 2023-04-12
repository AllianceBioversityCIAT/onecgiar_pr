import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { RelevantCountry } from '../entities/relevant-country.entity';

@Injectable()
export class RelevantCountryRepository extends Repository<RelevantCountry> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(RelevantCountry, dataSource.createEntityManager());
  }
}
