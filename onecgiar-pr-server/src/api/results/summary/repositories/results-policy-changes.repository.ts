import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultsPolicyChanges } from '../entities/results-policy-changes.entity';

@Injectable()
export class ResultsPolicyChangesRepository extends Repository<ResultsPolicyChanges> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError
  ) {
    super(ResultsPolicyChanges, dataSource.createEntityManager());
  }

  async ResultsPolicyChangesExists(resultId: number) {
    const queryData = `
    SELECT
    	rpc.result_policy_change_id,
    	rpc.amount,
    	rpc.is_active,
    	rpc.created_date,
    	rpc.last_updated_date,
    	rpc.result_id,
    	rpc.version_id,
    	rpc.created_by,
    	rpc.last_updated_by,
    	rpc.policy_stage_id,
    	rpc.policy_type_id
    FROM
    	results_policy_changes rpc
    WHERE 
    	rpc.result_id = ?;
    `;
    try {
      const resultTocResult: ResultsPolicyChanges[] = await this.query(queryData, [resultId]);
      return resultTocResult.length ? resultTocResult[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsPolicyChangesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

}

