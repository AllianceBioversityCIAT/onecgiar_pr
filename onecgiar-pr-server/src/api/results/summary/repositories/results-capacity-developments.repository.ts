import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultsCapacityDevelopments } from '../entities/results-capacity-developments.entity';

@Injectable()
export class ResultsCapacityDevelopmentsRepository extends Repository<ResultsCapacityDevelopments> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultsCapacityDevelopments, dataSource.createEntityManager());
  }

  async capDevExists(resultId: number) {
    const queryData = `
    SELECT
    	rcd.result_capacity_development_id,
    	rcd.is_active,
    	rcd.created_date,
    	rcd.last_updated_date,
    	rcd.result_id,
    	rcd.version_id,
    	rcd.created_by,
    	rcd.last_updated_by,
    	rcd.male_using,
    	rcd.female_using,
    	rcd.capdev_delivery_method_id,
    	rcd.capdev_term_id,
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

  async getSectionSevenDataForReport(resultCodesArray: number[]) {
    const resultCodes = (resultCodesArray ?? []).join(',');
    const queryData = `
    select 
      -- result basic data
      r.id 'Result ID', 
      r.result_code 'Result Code',
      -- Initiative Output - Capacity sharing for development specific fields
      rcd.female_using 'Number of females (CapDev)',
      rcd.male_using 'Number of males (CapDev)',
      if(ct.capdev_term_id in (3,4), ct.name, concat(ct.term, ' - ', ct.name)) as 'Lenght of training',
      cdm.name 'Delivery method',
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
