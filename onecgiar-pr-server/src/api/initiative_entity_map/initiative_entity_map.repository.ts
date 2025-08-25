import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InitiativeEntityMap } from './entities/initiative_entity_map.entity';

@Injectable()
export class InitiativeEntityMapRepository extends Repository<InitiativeEntityMap> {
  constructor(private dataSource: DataSource) {
    super(InitiativeEntityMap, dataSource.createEntityManager());
  }
}
