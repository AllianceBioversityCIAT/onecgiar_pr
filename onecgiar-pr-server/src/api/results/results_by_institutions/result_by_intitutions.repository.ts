import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsByInstitution } from './entities/results_by_institution.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class ResultByIntitutionsRepository extends Repository<ResultsByInstitution> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsByInstitution, dataSource.createEntityManager());
  }

  async getResultByInstitutionFull(resultId: number) {
    const queryData = `
    select 
    	rbi.id,
    	rbi.institutions_id,
    	rbi.institution_roles_id,
    	rbi.version_id
    from results_by_institution rbi 
    where rbi.result_id = ?
    	and rbi.is_active > 0;
    `;
    try {
      const completeUser: ResultsByInstitution[] = await this.query(queryData, [
        resultId,
      ]);
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByIntitutionsRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async logicalElimination(resultId: number) {
    const queryData = `
    update results_by_institution 
    set is_active = false
    where result_id = ?;
    `;
    try {
      const completeUser: any[] = await this.query(queryData, [resultId]);
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByIntitutionsRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultByInstitutionExists(resultId: number, institutionsId: number): Promise<ResultsByInstitution> {
    const queryData = `
    select 
    	rbi.id,
    	rbi.result_id,
    	rbi.institutions_id,
    	rbi.institution_roles_id,
    	rbi.is_active,
    	rbi.created_date,
    	rbi.version_id,
    	rbi.created_by,
    	rbi.last_updated_date,
    	rbi.last_updated_by 
    from results_by_institution rbi 
    where rbi.result_id = ?
      and rbi.institutions_id = ?;
    `;
    try {
      const completeUser: ResultsByInstitution[] = await this.query(queryData, [
        resultId, institutionsId
      ]);
      return completeUser.length? completeUser[0]: undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByIntitutionsRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
