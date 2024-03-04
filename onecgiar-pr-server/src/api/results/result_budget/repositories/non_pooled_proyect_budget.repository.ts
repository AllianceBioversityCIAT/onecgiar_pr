import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { NonPooledProjectBudget } from '../entities/non_pooled_proyect_budget.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { predeterminedDateValidation } from '../../../../shared/utils/versioning.utils';

@Injectable()
export class NonPooledProjectBudgetRepository
  extends BaseRepository<NonPooledProjectBudget>
  implements LogicalDelete<NonPooledProjectBudget>
{
  createQueries(
    config: ReplicableConfigInterface<NonPooledProjectBudget>,
  ): ConfigCustomQueryInterface {
    console.log('NonPooledProjectBudget');
    return {
      findQuery: `
      SELECT
          nppb.is_active,
          ${predeterminedDateValidation(config.predetermined_date)} AS created_date,
          nppb.last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          (
            SELECT
              npp2.id
            FROM
              non_pooled_project npp2
            WHERE
              npp2.center_grant_id = npp.center_grant_id
              AND npp2.results_id = ${config.new_result_id}
          ) AS non_pooled_projetct_id
      FROM
          non_pooled_projetct_budget nppb
          LEFT JOIN non_pooled_project npp ON npp.id = nppb.non_pooled_projetct_id
      WHERE 
        npp.results_id = ${config.old_result_id}
        AND npp.is_active = 1
        AND nppb.is_active = 1;
      `,
      insertQuery: `
      INSERT INTO
          non_pooled_projetct_budget (
              is_active,
              created_date,
              last_updated_date,
              created_by,
              last_updated_by,
              non_pooled_projetct_id
          )
      SELECT
          nppb.is_active,
          ${predeterminedDateValidation(config.predetermined_date)} AS created_date,
          nppb.last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          npp2.id AS non_pooled_projetct_id
      FROM
          non_pooled_projetct_budget nppb
          LEFT JOIN non_pooled_project npp ON npp.id = nppb.non_pooled_projetct_id
          LEFT JOIN non_pooled_project npp2 ON npp2.center_grant_id = npp.center_grant_id
          AND npp2.results_id = ${config.new_result_id}
      WHERE 
        npp.results_id = ${config.old_result_id}
        AND npp.is_active = 1
        AND nppb.is_active = 1;
      `,
      returnQuery: `
      SELECT
          nppb.non_pooled_projetct_budget_id
      FROM
          non_pooled_projetct_budget nppb
          LEFT JOIN non_pooled_project npp ON npp.id = nppb.non_pooled_projetct_id
      WHERE 
        npp.results_id = ${config.new_result_id}
        AND npp.is_active = 1
        AND nppb.is_active = 1;
      `,
    };
  }

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(NonPooledProjectBudget, dataSource.createEntityManager());
  }

  logicalDelete(resultId: number): Promise<NonPooledProjectBudget> {
    const queryData = `update  non_pooled_projetct_budget nppb
    inner join non_pooled_project npp on npp.id = nppb.non_pooled_projetct_id 
    set nppb.is_active = 0
    where npp.results_id = ?`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: NonPooledProjectBudgetRepository.name,
          debug: true,
        }),
      );
  }
  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete nppb from non_pooled_projetct_budget nppb
    inner join non_pooled_project npp on npp.id = nppb.non_pooled_projetct_id 
    where npp.results_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: NonPooledProjectBudgetRepository.name,
          debug: true,
        }),
      );
  }
}
