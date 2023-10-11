import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsByEvidence } from './entities/results_by_evidence.entity';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultByEvidencesRepository
  extends Repository<ResultsByEvidence>
  implements LogicalDelete<ResultsByEvidence>
{
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsByEvidence, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete rbe from results_by_evidence rbe where rbe.results_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultByEvidencesRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultsByEvidence> {
    const dataQuery = `update results_by_evidence rbe set rbe.is_active = 0 where rbe.results_id = ? and rbe.is_active > 0;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultByEvidencesRepository.name,
          debug: true,
        }),
      );
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
    update evidence
    set is_active = false
    where result_id = ?;
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
