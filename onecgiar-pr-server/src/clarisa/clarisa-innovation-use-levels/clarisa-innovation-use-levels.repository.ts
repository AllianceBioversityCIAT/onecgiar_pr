import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaInnovationUseLevel } from './entities/clarisa-innovation-use-level.entity';

@Injectable()
export class ClarisaInnovationUseLevelRepository extends Repository<ClarisaInnovationUseLevel> {
  constructor(private dataSource: DataSource) {
    super(ClarisaInnovationUseLevel, dataSource.createEntityManager());
  }
}
