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
import { ResultImpactLevel } from '../entities/result-impact-level.entity';

@Injectable()
export class ResultImpactLevelRepository
  extends BaseRepository<ResultImpactLevel>
  implements LogicalDelete<ResultImpactLevel>
{
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultImpactLevel, dataSource.createEntityManager());
  }

  /** Phase replication (IRS-R-14): copies the active row to the new result id. */
  createQueries(
    config: ReplicableConfigInterface<ResultImpactLevel>,
  ): ConfigCustomQueryInterface {
    const date = predeterminedDateValidation(config.predetermined_date);
    return {
      findQuery: `
      SELECT ${config.new_result_id} AS result_id, ril.is_active, ${date} AS created_date,
        NULL AS last_updated_date,
        ${config.user.id} AS created_by, ${config.user.id} AS last_updated_by,
        ril.impact_study_type_id, ril.cgiar_contribution, ril.previously_reported
      FROM results_impact_level ril
      WHERE ril.result_id = ${config.old_result_id} AND ril.is_active = 1;
      `,
      insertQuery: `
      INSERT INTO results_impact_level (
        result_id, impact_study_type_id, cgiar_contribution, previously_reported,
        is_active, created_date, last_updated_date, created_by, last_updated_by
      )
      SELECT ${config.new_result_id}, ril.impact_study_type_id, ril.cgiar_contribution,
        ril.previously_reported, ril.is_active, ${date}, NULL,
        ${config.user.id}, ${config.user.id}
      FROM results_impact_level ril
      WHERE ril.result_id = ${config.old_result_id} AND ril.is_active = 1;
      `,
      returnQuery: `
      SELECT ril.id FROM results_impact_level ril
      WHERE ril.result_id = ${config.new_result_id} AND ril.is_active = 1;
      `,
    };
  }

  fisicalDelete(resultId: number): Promise<any> {
    return this.query('DELETE FROM results_impact_level WHERE result_id = ?;', [
      resultId,
    ]).catch((err) =>
      this._handlersError.returnErrorRepository({
        error: err,
        className: ResultImpactLevelRepository.name,
        debug: true,
      }),
    );
  }

  logicalDelete(resultId: number): Promise<ResultImpactLevel> {
    return this.query(
      'UPDATE results_impact_level SET is_active = 0 WHERE is_active > 0 AND result_id = ?;',
      [resultId],
    ).catch((err) =>
      this._handlersError.returnErrorRepository({
        error: err,
        className: ResultImpactLevelRepository.name,
        debug: true,
      }),
    );
  }
}
