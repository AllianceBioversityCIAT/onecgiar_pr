import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { LegacyResult } from './entities/legacy-result.entity';

@Injectable()
export class ResultLegacyRepository extends Repository<LegacyResult> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(LegacyResult, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM legacy_result;
    `;
    try {
      await this.query(queryData);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultLegacyRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
