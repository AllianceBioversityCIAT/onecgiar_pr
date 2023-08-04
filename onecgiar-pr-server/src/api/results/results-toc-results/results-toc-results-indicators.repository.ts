import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsTocResultIndicators } from './entities/results-toc-results-indicators.entity';

@Injectable()
export class ResultsTocResultIndicatorsRepository extends Repository<ResultsTocResultIndicators> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsTocResultIndicators, dataSource.createEntityManager());
  }
}