import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultActor } from '../entities/result-actor.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';

@Injectable()
export class ResultActorRepository extends Repository<ResultActor> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultActor, dataSource.createEntityManager());
  }
}
