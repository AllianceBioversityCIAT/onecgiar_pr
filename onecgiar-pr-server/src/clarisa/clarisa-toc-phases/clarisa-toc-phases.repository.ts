import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaTocPhase } from './entities/clarisa-toc-phase.entity';

@Injectable()
export class ClarisaTocPhaseRepository extends Repository<ClarisaTocPhase> {
  constructor(private dataSource: DataSource) {
    super(ClarisaTocPhase, dataSource.createEntityManager());
  }
}
