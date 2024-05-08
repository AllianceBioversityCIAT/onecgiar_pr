import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultsPolicyChanges } from '../entities/results-policy-changes.entity';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import { predeterminedDateValidation } from '../../../../shared/utils/versioning.utils';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class ResultsPolicyChangesRepository
  extends BaseRepository<ResultsPolicyChanges>
  implements LogicalDelete<ResultsPolicyChanges>
{
  createQueries(
    config: ReplicableConfigInterface<ResultsPolicyChanges>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      select 
      null as result_policy_change_id,
      rpc.amount,
      rpc.is_active,
      ${predeterminedDateValidation(
        config?.predetermined_date,
      )} as created_date,
      null as last_updated_date,
      ${config.new_result_id} as result_id,
      ${config.user.id} as created_by,
      null as last_updated_by,
      rpc.policy_stage_id,
      rpc.policy_type_id,
      rpc.status_amount
      from results_policy_changes rpc 
      WHERE rpc.result_id = ${config.old_result_id} and rpc.is_active > 0
      `,
      insertQuery: `
      insert into results_policy_changes 
      (
      amount,
      is_active,
      created_date,
      last_updated_date,
      result_id,
      created_by,
      last_updated_by,
      policy_stage_id,
      policy_type_id,
      status_amount
      )
      select 
      rpc.amount,
      rpc.is_active,
      ${predeterminedDateValidation(
        config?.predetermined_date,
      )} as created_date,
      null as last_updated_date,
      ${config.new_result_id} as result_id,
      ${config.user.id} as created_by,
      null as last_updated_by,
      rpc.policy_stage_id,
      rpc.policy_type_id,
      rpc.status_amount
      from results_policy_changes rpc 
      WHERE rpc.result_id = ${config.old_result_id} and rpc.is_active > 0`,
      returnQuery: `
      select *
      from results_policy_changes rpc 
      WHERE rpc.result_id = ${config.new_result_id}`,
    };
  }
  private readonly _logger: Logger = new Logger(
    ResultsPolicyChangesRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultsPolicyChanges, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete rpc from results_policy_changes rpc where rpc.result_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsPolicyChangesRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultsPolicyChanges> {
    const queryData = `update results_policy_changes rpc set rpc.is_active = 0 where rpc.result_id = ? and rpc.is_active > 0;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsPolicyChangesRepository.name,
          debug: true,
        }),
      );
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
    	rpc.created_by,
    	rpc.last_updated_by,
    	rpc.policy_stage_id,
    	rpc.policy_type_id,
      rpc.status_amount,
      rpc.linked_innovation_dev,
      rpc.linked_innovation_use,
      rpc.result_related_engagement
    FROM
    	results_policy_changes rpc
    WHERE 
    	rpc.result_id = ?;
    `;
    try {
      const resultTocResult: ResultsPolicyChanges[] = await this.query(
        queryData,
        [resultId],
      );
      return resultTocResult.length ? resultTocResult[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsPolicyChangesRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getSectionSevenDataForReport(
    resultCodesArray: number[],
    phase?: number,
  ) {
    const resultCodes = (resultCodesArray ?? []).join(',');
    const queryData = `
    select 
      -- result basic data
      r.id 'Result ID', 
      r.result_code 'Result Code',
      -- Action Area Outcome - Policy change specific fields
      cpt.name as 'Policy type',
      (
        SELECT
          GROUP_CONCAT(
            (
              SELECT
                rq2.question_text
              FROM
                result_questions rq2
              WHERE
                rq2.result_question_id = rq.parent_question_id
            ),
            '  ',
            rq.question_text SEPARATOR '\n'
          ) AS 'Questions'
        FROM
          result_answers ra2
          LEFT JOIN result_questions rq ON rq.result_question_id = ra2.result_question_id
        WHERE
          ra2.result_id = r.id
          AND ra2.is_active = TRUE
          AND ra2.answer_boolean = TRUE
        ORDER BY
          rq.result_question_id ASC
      ) AS 'Is this result related to',
      if(cpt.id <> 1, 'Not applicable', format(rpc.amount, 2)) 'USD Amount',
      if(cpt.id <> 1, 'Not applicable', 
        (
          case
            when rpc.status_amount = 1 then 'Confirmed'
            when rpc.status_amount = 2 then 'Estimated'
            when rpc.status_amount = 3 then 'Unknown'
            else '???'
          end
        )
      ) as 'Status (Policy change)',
      concat(cps.name, ' - ', cps.definition) 'Stage (Policy change)',
      group_concat(distinct concat(if(coalesce(ci.acronym, '') = '', '', concat(ci.acronym, ' - ')), ci.name) separator '; ') as 'Implementing organizations (Policy change)'
    from results_policy_changes rpc
    right join result r on rpc.result_id = r.id and r.is_active = 1
    left join clarisa_policy_type cpt on rpc.policy_type_id = cpt.id
    left join clarisa_policy_stage cps on rpc.policy_stage_id = cps.id 
    left join results_by_institution rbi on rbi.result_id = r.id and rbi.is_active = 1 and rbi.institution_roles_id = 4
    left join clarisa_institutions ci on rbi.institutions_id = ci.id and ci.is_active = 1
    where 
      rpc.is_active = 1 
      and r.result_code ${resultCodes.length ? `in (${resultCodes})` : '= 0'}
      ${phase ? `and r.version_id = ${phase}` : ''}
    group by 1,2,3,4,5,6
    ;
    `;
    try {
      const resultTocResult = await this.query(queryData);
      return resultTocResult;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsPolicyChanges.name,
        error: error,
        debug: true,
      });
    }
  }
}
