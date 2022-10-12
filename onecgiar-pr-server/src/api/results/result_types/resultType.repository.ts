import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultType } from './entities/result_type.entity';

@Injectable()
export class ResultTypeRepository extends Repository<ResultType> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultType, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM result_type;
    `;
    try {
      await this.query(queryData);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultTypeRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAllResultType(): Promise<ResultType[]> {
    const queryData = `
    select 
        rt.id,
        rt.name,
        rt.description,
        rt.result_level_id 
    from result_type rt;
    `;
    try {
      const resultType = await this.query(queryData);
      return resultType;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultTypeRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getOneResultTypeById(resultTypeId: number): Promise<ResultType> {
    const queryData = `
    select 
        rt.id,
        rt.name,
        rt.description,
        rt.result_level_id 
    from result_type rt
    where rt.id = ?;
    `;
    try {
      const resultType = await this.query(queryData, [resultTypeId]);
      return resultType;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultTypeRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
