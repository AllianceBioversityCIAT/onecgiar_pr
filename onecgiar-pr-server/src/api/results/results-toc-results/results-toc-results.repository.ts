import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsTocResult } from './entities/results-toc-result.entity';

@Injectable()
export class ResultsTocResultRepository extends Repository<ResultsTocResult> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsTocResult, dataSource.createEntityManager());
  }

  async getTocByResult() {
    const queryData = `
    
    `;
    try {
      const version: ResultsTocResult[] = await this.query(queryData);
      return version.length ? version[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
