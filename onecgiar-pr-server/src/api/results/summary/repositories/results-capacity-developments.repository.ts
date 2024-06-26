import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultsCapacityDevelopments } from '../entities/results-capacity-developments.entity';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import { predeterminedDateValidation } from '../../../../shared/utils/versioning.utils';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class ResultsCapacityDevelopmentsRepository
  extends BaseRepository<ResultsCapacityDevelopments>
  implements LogicalDelete<ResultsCapacityDevelopments>
{
  createQueries(
    config: ReplicableConfigInterface<ResultsCapacityDevelopments>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      select 
      null as result_capacity_development_id,
      rcd.is_active,
      ${predeterminedDateValidation(
        config?.predetermined_date,
      )} as created_date,
      null as last_updated_date,
      ${config.new_result_id} as result_id,
      ${config.user.id} as created_by,
      null as last_updated_by,
      rcd.male_using,
      rcd.female_using,
      rcd.capdev_delivery_method_id,
      rcd.capdev_term_id
      from results_capacity_developments rcd where rcd.result_id = ${
        config.old_result_id
      } and rcd.is_active > 0;
      `,
      insertQuery: `
      insert into results_capacity_developments (
        is_active,
        created_date,
        last_updated_date,
        result_id,
        created_by,
        last_updated_by,
        male_using,
        female_using,
        capdev_delivery_method_id,
        capdev_term_id
        )
        select
        rcd.is_active,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date,
        null as last_updated_date,
        ${config.new_result_id} as result_id,
        ${config.user.id} as created_by,
        null as last_updated_by,
        rcd.male_using,
        rcd.female_using,
        rcd.capdev_delivery_method_id,
        rcd.capdev_term_id
        from results_capacity_developments rcd where rcd.result_id = ${
          config.old_result_id
        } and rcd.is_active > 0`,
      returnQuery: `
        select *
        from results_capacity_developments rcd where rcd.result_id = ${config.new_result_id}`,
    };
  }
  private readonly _logger: Logger = new Logger(
    ResultsCapacityDevelopmentsRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultsCapacityDevelopments, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete rcd from results_capacity_developments rcd where rcd.result_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsCapacityDevelopmentsRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultsCapacityDevelopments> {
    const queryData = `update results_capacity_developments set is_active = 0 where result_id = ?`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsCapacityDevelopmentsRepository.name,
          debug: true,
        }),
      );
  }

  async capDevExists(resultId: number) {
    const queryData = `
    SELECT
    	rcd.result_capacity_development_id,
    	rcd.is_active,
    	rcd.created_date,
    	rcd.last_updated_date,
    	rcd.result_id,
    	rcd.created_by,
    	rcd.last_updated_by,
    	rcd.male_using,
    	rcd.female_using,
    	rcd.non_binary_using,
      rcd.has_unkown_using,
    	rcd.capdev_delivery_method_id,
    	rcd.capdev_term_id,
      rcd.is_attending_for_organization,
    	ct.name as capdev_term_name,
    	ct.term as capdev_term_term,
    	ct.description as capdev_term_description
    from
    	results_capacity_developments rcd
      left join capdevs_term ct on ct.capdev_term_id = rcd.capdev_term_id 
    WHERE 
    	rcd.result_id = ?
    	and rcd.is_active > 0;
    `;
    try {
      const resultTocResult: ResultsCapacityDevelopments[] = await this.query(
        queryData,
        [resultId],
      );
      return resultTocResult.length ? resultTocResult[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsCapacityDevelopmentsRepository.name,
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
      -- Initiative Output - Capacity sharing for development specific fields
      format(rcd.female_using, 0, 'es_ES') AS 'Number of females (CapDev)',
      format(rcd.male_using, 0, 'es_ES') AS 'Number of males (CapDev)',
      format(rcd.non_binary_using, 0, 'es_ES') AS 'Number of non-binary (CapDev)',
      format(rcd.has_unkown_using, 0, 'es_ES') AS 'Has unknown using (CapDev)',
      if(ct.capdev_term_id in (3,4), ct.name, concat(ct.term, ' - ', ct.name)) as 'Lenght of training',
      cdm.name 'Delivery method',
      (case
        when rcd.is_attending_for_organization = 0 then "No"
        when rcd.is_attending_for_organization = 1 then "Yes"
        else "Not defined"
      end) as 'Were the trainees attending on behalf of an organization?',
      group_concat(distinct concat(if(coalesce(ci.acronym, '') = '', '', concat(ci.acronym, ' - ')), ci.name) separator '; ') as 'Implementing organizations (CapDev)'
    from results_capacity_developments rcd 
    left join result r on rcd.result_id = r.id and r.is_active = 1
    left join capdevs_term ct on rcd.capdev_term_id = ct.capdev_term_id
    left join capdevs_delivery_methods cdm on rcd.capdev_delivery_method_id = cdm.capdev_delivery_method_id
    left join results_by_institution rbi on rbi.result_id = r.id and rbi.is_active = 1 and rbi.institution_roles_id = 3
    left join clarisa_institutions ci on rbi.institutions_id = ci.id and ci.is_active = 1
    where 
      rcd.is_active = 1
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
        className: ResultsCapacityDevelopments.name,
        error: error,
        debug: true,
      });
    }
  }
}
