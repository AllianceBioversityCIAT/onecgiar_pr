import { DataSource, Repository } from 'typeorm';
import { ClarisaInitiativeStage } from '../entities/clarisa-initiative-stage.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ClarisaInitiativeStageRepository extends Repository<ClarisaInitiativeStage> {
  constructor(private dataSource: DataSource) {
    super(ClarisaInitiativeStage, dataSource.createEntityManager());
  }
}
