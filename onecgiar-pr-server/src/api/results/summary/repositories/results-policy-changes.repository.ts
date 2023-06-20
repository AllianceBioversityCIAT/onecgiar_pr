import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultsPolicyChanges } from '../entities/results-policy-changes.entity';
import {
  ReplicableConfigInterface,
  ReplicableInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';

@Injectable()
export class ResultsPolicyChangesRepository
  extends Repository<ResultsPolicyChanges>
  implements ReplicableInterface<ResultsPolicyChanges>
{
  private readonly _logger: Logger = new Logger(
    ResultsPolicyChangesRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultsPolicyChanges, dataSource.createEntityManager());
  }

  async replicable(
    config: ReplicableConfigInterface<ResultsPolicyChanges>,
  ): Promise<ResultsPolicyChanges> {
    let final_data: ResultsPolicyChanges = null;
    try {
      if (config.f?.custonFunction) {
        const queryData = `
        select 
        null as result_policy_change_id,
        rpc.amount,
        rpc.is_active,
        now() as created_date,
        null as last_updated_date,
        ? as result_id,
        ? as version_id,
        ? as created_by,
        null as last_updated_by,
        rpc.policy_stage_id,
        rpc.policy_type_id,
        rpc.status_amount
        from results_policy_changes rpc 
        WHERE rpc.result_id = ? and rpc.is_active > 0
        `;
        const response = await (<Promise<ResultsPolicyChanges[]>>(
          this.query(queryData, [
            config.new_result_id,
            config.phase,
            config.user.id,
            config.old_result_id,
          ])
        ));
        const response_edit = <ResultsPolicyChanges>(
          config.f.custonFunction(response?.length ? response[0] : null)
        );
        final_data = await this.save(response_edit);
      } else {
        const queryData: string = `
        insert into results_policy_changes 
        (
        amount,
        is_active,
        created_date,
        last_updated_date,
        result_id,
        version_id,
        created_by,
        last_updated_by,
        policy_stage_id,
        policy_type_id,
        status_amount
        )
        select 
        rpc.amount,
        rpc.is_active,
        now() as created_date,
        null as last_updated_date,
        ? as result_id,
        ? as version_id,
        ? as created_by,
        null as last_updated_by,
        rpc.policy_stage_id,
        rpc.policy_type_id,
        rpc.status_amount
        from results_policy_changes rpc 
        WHERE rpc.result_id = ? and rpc.is_active > 0`;
        await this.query(queryData, [
          config.new_result_id,
          config.phase,
          config.user.id,
          config.old_result_id,
        ]);

        const queryFind = `
        select 
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
        rpc.policy_type_id,
        rpc.status_amount
        from results_policy_changes rpc 
        WHERE rpc.result_id = ?`;
        final_data = await this.query(queryFind, [config.new_result_id]);
      }
    } catch (error) {
      config.f?.errorFunction
        ? config.f.errorFunction(error)
        : this._logger.error(error);
      final_data = null;
    }

    config.f?.completeFunction
      ? config.f.completeFunction({ ...final_data })
      : null;

    return final_data;
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
    	rpc.policy_type_id,
      rpc.status_amount
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

  async getSectionSevenDataForReport(resultCodesArray: number[]) {
    const resultCodes = (resultCodesArray ?? []).join(',');
    const queryData = `
    select 
      -- result basic data
      r.id 'Result ID', 
      r.result_code 'Result Code',
      -- Action Area Outcome - Policy change specific fields
      cpt.name as 'Policy type',
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
