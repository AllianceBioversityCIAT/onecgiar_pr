import { EntityManager, EntityTarget, QueryRunner } from 'typeorm';
import { ReplicableRepository } from './replicable-repository';

export abstract class BaseRepository<T> extends ReplicableRepository<T> {
  constructor(
    target: EntityTarget<T>,
    manager: EntityManager,
    queryRunner?: QueryRunner,
  ) {
    super(target, manager, queryRunner);
  }
}
