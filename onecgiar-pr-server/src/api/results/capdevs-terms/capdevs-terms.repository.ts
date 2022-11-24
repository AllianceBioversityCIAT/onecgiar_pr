import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { CapdevsTerm } from './entities/capdevs-term.entity';

@Injectable()
export class CapdevsTermRepository extends Repository<CapdevsTerm> {
  constructor(private dataSource: DataSource) {
    super(CapdevsTerm, dataSource.createEntityManager());
  }
}
