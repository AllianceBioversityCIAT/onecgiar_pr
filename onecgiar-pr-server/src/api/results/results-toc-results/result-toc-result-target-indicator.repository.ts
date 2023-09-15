import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultIndicatorTarget } from './entities/result-toc-result-target-indicators.entity';

@Injectable()
export class ResultsTocTargetIndicatorRepository extends Repository<ResultIndicatorTarget> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultIndicatorTarget, dataSource.createEntityManager());
  }
}