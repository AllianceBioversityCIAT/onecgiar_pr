import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsPackageTocResult } from './entities/results-package-toc-result.entity';

@Injectable()
export class ResultsPackageTocResultRepository extends Repository<ResultsPackageTocResult> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsPackageTocResult, dataSource.createEntityManager());
  }

}