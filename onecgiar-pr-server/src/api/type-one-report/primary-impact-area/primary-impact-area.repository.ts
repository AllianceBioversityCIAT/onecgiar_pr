import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { PrimaryImpactArea } from './entities/primary-impact-area.entity';

@Injectable()
export class PrimaryImpactAreaRepository extends Repository<PrimaryImpactArea> {
  constructor(private dataSource: DataSource) {
    super(PrimaryImpactArea, dataSource.createEntityManager());
  }
}
