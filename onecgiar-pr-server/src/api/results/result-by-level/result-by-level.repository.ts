import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultByLevel } from './entities/result-by-level.entity';

@Injectable()
export class ResultByLevelRepository extends Repository<ResultByLevel> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultByLevel, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM result_by_level;
    `;
    try {
      await this.query(queryData);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByLevelRepository.name,
        error: error,
        debug: true,
      });
    }
  }

}
