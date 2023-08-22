import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsTocResultIndicators } from './entities/results-toc-results-indicators.entity';
import { ResultTocImpactArea } from './entities/result-toc-impact-area-target.entity';
import { ResultTocSdgTargets } from './entities/result-toc-sdg-target.entity';
import { ResultSdgTargets } from './entities/results-sdg-targets.entity';

@Injectable()
export class ResultsSdgTargetRepository extends Repository<ResultSdgTargets> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultSdgTargets, dataSource.createEntityManager());
  }
}