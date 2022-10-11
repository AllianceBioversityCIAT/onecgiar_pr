import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsByInititiative } from './entities/results_by_inititiative.entity';
import { InitiativeByResultDTO } from './dto/InitiativeByResult.dto';

@Injectable()
export class ResultByInitiativesRepository extends Repository<ResultsByInititiative> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError
    ) {
    super(ResultsByInititiative, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM results_by_inititiative;
    `;
    try {
      await this.query(queryData);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInitiativesRepository.name,
        error: error,
        debug: true
      });
    }
  }

  async InitiativeByResult(resultId: number) {
    const queryData = `
    select 
    	ci.id,
      ci.official_code,
      ci.name as initiative_name,
      rbi.initiative_role_id,
      rbi.version_id,
      rbi.is_active 
    from results_by_inititiative rbi 
    	inner join clarisa_initiatives ci on ci.id = rbi.inititiative_id 
        									and ci.active > 0
    where rbi.result_id = ?
      and rbi.is_active > 0;
    `;
    try {
      const completeUser: InitiativeByResultDTO[] = await this.query(queryData, [resultId]);
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInitiativesRepository.name,
        error: error,
        debug: true
      });
    }
  }

  async getResultByInitiativeFull(resultId: number) {
    const queryData = `
    select 
    	rbi.id,
    	rbi.result_id,
    	rbi.inititiative_id,
    	rbi.initiative_role_id,
    	rbi.is_active,
    	rbi.version_id,
    	rbi.created_by,
    	rbi.created_date,
    	rbi.last_updated_by,
    	rbi.last_updated_date 
    from results_by_inititiative rbi 
    where rbi.result_id = ?
      and rbi.is_active > 0;
    `;
    try {
      const completeUser: ResultsByInititiative[] = await this.query(queryData, [resultId]);
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInitiativesRepository.name,
        error: error,
        debug: true
      });
    }
  }

  async logicalElimination(resultId: number) {
    const queryData = `
    update results_by_inititiative
    set is_active = false
    where result_id = ?;
    `;
    try {
      const completeUser: any[] = await this.query(queryData, [resultId]);
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByInitiativesRepository.name,
        error: error,
        debug: true
      });
    }
  }

}
