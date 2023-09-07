import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultTocActionArea } from './entities/result-toc-action-area.entity';

@Injectable()
export class ResultsActionAreaOutcomeRepository extends Repository<ResultTocActionArea> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultTocActionArea, dataSource.createEntityManager());
  }
}