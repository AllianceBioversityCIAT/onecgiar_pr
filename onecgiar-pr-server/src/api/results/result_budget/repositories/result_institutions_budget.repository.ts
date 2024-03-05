import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultInstitutionsBudget } from '../entities/result_institutions_budget.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';
import {
  ReplicableConfigInterface,
  ConfigCustomQueryInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { predeterminedDateValidation } from '../../../../shared/utils/versioning.utils';

@Injectable()
export class ResultInstitutionsBudgetRepository
  extends BaseRepository<ResultInstitutionsBudget>
  implements LogicalDelete<ResultInstitutionsBudget>
{
  createQueries(
    config: ReplicableConfigInterface<ResultInstitutionsBudget>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      SELECT
          rib.is_active,
          ${predeterminedDateValidation(config?.predetermined_date)} AS created_date,
          rib.last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          (
              SELECT
                  result_institution_id
              FROM
                  results_by_institution rbi2
              WHERE
                rbi2.institutions_id = rbi.institutions_id
                AND rbi2.result_id = ${config.new_result_id}
          ) AS result_institution_id,
          is_determined,
          in_kind,
          in_cash,
          kind_cash
      FROM
          result_institutions_budget rib
          LEFT JOIN results_by_institution rbi ON rbi.id = rib.result_institution_id
      WHERE 
        rbi.result_id = ${config.old_result_id}
        AND rbi.is_active = 1
        AND rib.is_active = 1;
      `,
      insertQuery: `
      INSERT INTO
          result_institutions_budget (
              is_active,
              created_date,
              last_updated_date,
              created_by,
              last_updated_by,
              result_institution_id,
              is_determined,
              in_kind,
              in_cash,
              kind_cash
          )
      SELECT
          rib.is_active,
          ${predeterminedDateValidation(config?.predetermined_date)} AS created_date,
          rib.last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          rbi2.id AS result_institution_id,
          rib.is_determined,
          rib.in_kind,
          rib.in_cash,
          rib.kind_cash
      FROM
          result_institutions_budget rib
          LEFT JOIN results_by_institution rbi ON rbi.id = rib.result_institution_id
          LEFT JOIN results_by_institution rbi2 ON rbi2.institutions_id = rbi.institutions_id
          AND rbi2.result_id = ${config.new_result_id}
      WHERE 
        rbi.result_id = ${config.old_result_id}
        AND rbi.is_active = 1
        AND rib.is_active = 1;
      `,
      returnQuery: `
      SELECT
          result_institutions_budget_id
      FROM
          result_institutions_budget rib
          LEFT JOIN results_by_institution rbi ON rbi.id = rib.result_institution_id
      WHERE 
        rbi.result_id = ${config.old_result_id}
        AND rbi.is_active = 1
        AND rib.is_active = 1;
      `,
    };
  }

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultInstitutionsBudget, dataSource.createEntityManager());
  }
  logicalDelete(resultId: number): Promise<ResultInstitutionsBudget> {
    const queryData = `delete rib from result_institutions_budget rib 
    inner join results_by_institution rbi on rbi.id = rib.result_institution_id 
    where rbi.result_id = ?`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultInstitutionsBudgetRepository.name,
          debug: true,
        }),
      );
  }
  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `update result_institutions_budget rib 
    inner join results_by_institution rbi on rbi.id = rib.result_institution_id 
    set rib.is_active = 0
    where rbi.result_id = ?`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultInstitutionsBudgetRepository.name,
          debug: true,
        }),
      );
  }
}
