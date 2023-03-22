import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { Expertises } from '../entities/expertises.entity';

@Injectable()
export class ExpertisesRepository extends Repository<Expertises> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(Expertises, dataSource.createEntityManager());
  }
}
