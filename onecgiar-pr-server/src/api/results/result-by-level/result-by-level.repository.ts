import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultByLevel } from './entities/result-by-level.entity';
import { getResultTypeLevelDto } from './dto/get-result-type-level.dto';

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

  async getAllResultTypeByLevel() {
    const queryData = `
    select 
    	rbl.result_level_id,
    	rt.id,
    	rt.name,
    	rt.description 
    from result_by_level rbl  
    	inner join result_type rt on rt.id = rbl.result_type_id
                                and rt.is_active > 0;
    `;
    try {
      const resultByLevel: getResultTypeLevelDto[] = await this.query(
        queryData,
      );
      return resultByLevel;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByLevelRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getByTypeAndLevel(levelId: number, typeId: number) {
    const queryData = `
    select 
    	rbl.id,
    	rbl.result_level_id,
    	rbl.result_type_id 
    from result_by_level rbl 
    inner join result_type rt on rt.id = rbl.result_type_id
                                and rt.is_active > 0
    where rbl.result_level_id = ?
    	and rbl.result_type_id = ?;
    `;
    try {
      const resultByLevel: ResultByLevel[] = await this.query(queryData, [
        levelId,
        typeId,
      ]);
      return resultByLevel.length ? resultByLevel[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByLevelRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
