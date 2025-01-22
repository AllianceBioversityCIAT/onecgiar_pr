import { Injectable } from '@nestjs/common';
import { GlobalNarrative } from '../entities/global-narrative.entity';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class GlobalNarrativeRepository extends Repository<GlobalNarrative> {
  constructor(private dataSource: DataSource) {
    super(GlobalNarrative, dataSource.createEntityManager());
  }
}
