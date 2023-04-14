import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsIpActor } from './entities/results-ip-actor.entity';

@Injectable()
export class ResultsIpActorRepository extends Repository<ResultsIpActor> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultsIpActor, dataSource.createEntityManager());
  }
}
