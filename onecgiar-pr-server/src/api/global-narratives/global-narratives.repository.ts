import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { GlobalNarrative } from './entities/global-narrative.entity';

@Injectable()
export class GlobalNarrativeRepository extends Repository<GlobalNarrative> {
  constructor(private _dataSource: DataSource) {
    super(GlobalNarrative, _dataSource.createEntityManager());
  }
}
