import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultLevel } from './entities/result_level.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class ResultLevelRepository extends Repository<ResultLevel> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError
  ) {
    super(ResultLevel, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM role_levels;
    `;
    try {
      await this.query(queryData);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultLevelRepository.name,
        error: error,
        debug: true
      });
    }
  }

}
