import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { predeterminedDateValidation } from '../../../../shared/utils/versioning.utils';
import { ResultImpactPreviousResult } from '../entities/result-impact-previous-result.entity';

@Injectable()
export class ResultImpactPreviousResultRepository
  extends BaseRepository<ResultImpactPreviousResult>
  implements LogicalDelete<ResultImpactPreviousResult>
{
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultImpactPreviousResult, dataSource.createEntityManager());
  }

  /** Phase replication (IRS-R-14): links keep pointing at the same previous_result_id. */
  createQueries(
    config: ReplicableConfigInterface<ResultImpactPreviousResult>,
  ): ConfigCustomQueryInterface {
    const date = predeterminedDateValidation(config.predetermined_date);
    return {
      findQuery: `
      SELECT ${config.new_result_id} AS result_id, rip.is_active, ${date} AS created_date,
        ${config.user.id} AS created_by, rip.previous_result_id
      FROM results_impact_previous_result rip
      WHERE rip.result_id = ${config.old_result_id} AND rip.is_active = 1;
      `,
      insertQuery: `
      INSERT INTO results_impact_previous_result (
        result_id, previous_result_id, is_active, created_date, created_by
      )
      SELECT ${config.new_result_id}, rip.previous_result_id, rip.is_active, ${date},
        ${config.user.id}
      FROM results_impact_previous_result rip
      WHERE rip.result_id = ${config.old_result_id} AND rip.is_active = 1;
      `,
      returnQuery: `
      SELECT rip.id FROM results_impact_previous_result rip
      WHERE rip.result_id = ${config.new_result_id} AND rip.is_active = 1;
      `,
    };
  }

  fisicalDelete(resultId: number): Promise<any> {
    return this.query(
      'DELETE FROM results_impact_previous_result WHERE result_id = ?;',
      [resultId],
    ).catch((err) =>
      this._handlersError.returnErrorRepository({
        error: err,
        className: ResultImpactPreviousResultRepository.name,
        debug: true,
      }),
    );
  }

  logicalDelete(resultId: number): Promise<ResultImpactPreviousResult> {
    return this.query(
      'UPDATE results_impact_previous_result SET is_active = 0 WHERE is_active > 0 AND result_id = ?;',
      [resultId],
    ).catch((err) =>
      this._handlersError.returnErrorRepository({
        error: err,
        className: ResultImpactPreviousResultRepository.name,
        debug: true,
      }),
    );
  }
}
