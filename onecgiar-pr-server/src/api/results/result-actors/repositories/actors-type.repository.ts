import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ActorType } from '../entities/actor-type.entity';

@Injectable()
export class ActorTypeRepository extends Repository<ActorType> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ActorType, dataSource.createEntityManager());
  }
}
