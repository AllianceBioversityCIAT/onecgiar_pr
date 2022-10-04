import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { GenderTagLevel } from './entities/gender_tag_level.entity';

@Injectable()
export class GenderTagRepository extends Repository<GenderTagLevel> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError
    ) {
    super(GenderTagLevel, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM result_type;
    `;
    try {
      await this.query(queryData);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: GenderTagRepository.name,
        error: error,
        debug: true
      });
    }
  }

}
