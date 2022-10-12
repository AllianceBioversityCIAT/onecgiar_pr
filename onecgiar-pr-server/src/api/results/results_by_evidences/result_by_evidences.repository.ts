import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsByEvidence } from './entities/results_by_evidence.entity';

@Injectable()
export class ResultByEvidencesRepository extends Repository<ResultsByEvidence> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsByEvidence, dataSource.createEntityManager());
  }

  async getResultByEvidenceFull(resultId: number) {
    const queryData = `
    select 
    	rbe.id,
    	rbe.is_active,
    	rbe.creation_date,
    	rbe.last_updated_date,
    	rbe.results_id,
    	rbe.evidences_id,
    	rbe.evidence_types_id,
    	rbe.version_id,
    	rbe.created_by,
    	rbe.last_updated_by 
    from results_by_evidence rbe 
    where rbe.results_id  = ?
         and rbe.is_active  > 0;
    `;
    try {
      const completeUser: ResultsByEvidence[] = await this.query(queryData, [
        resultId,
      ]);
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByEvidencesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async logicalElimination(resultId: number) {
    const queryData = `
    update results_by_evidence
    set is_active = false
    where results_id = ?;
    `;
    try {
      const completeUser: any[] = await this.query(queryData, [resultId]);
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultByEvidencesRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
