import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsTocResultIndicators } from './entities/results-toc-results-indicators.entity';
import { ResultTocImpactArea } from './entities/result-toc-impact-area-target.entity';

@Injectable()
export class ResultsTocImpactAreaTargetRepository extends Repository<ResultTocImpactArea> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultTocImpactArea, dataSource.createEntityManager());
  }
}