import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaGlobalUnitLineage } from './entities/clarisa-global-unit-lineage.entity';

@Injectable()
export class ClarisaGlobalUnitLineageRepository extends Repository<ClarisaGlobalUnitLineage> {
  constructor(private readonly dataSource: DataSource) {
    super(ClarisaGlobalUnitLineage, dataSource.createEntityManager());
  }
}
