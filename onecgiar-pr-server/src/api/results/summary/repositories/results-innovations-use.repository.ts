import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsInnovationsUse } from '../entities/results-innovations-use.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';

@Injectable()
export class ResultsInnovationsUseRepository extends Repository<ResultsInnovationsUse> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultsInnovationsUse, dataSource.createEntityManager());
  }

  async InnovatonUseExists(resultId: number) {
    const queryData = `
    select
      riu.result_innovation_use_id,
    	riu.male_using,
    	riu.female_using,
    	riu.is_active,
    	riu.created_date,
    	riu.last_updated_date,
    	riu.results_id,
    	riu.version_id,
    	riu.created_by,
    	riu.last_updated_by
    from
    	results_innovations_use riu
    WHERE
      riu.results_id = ?
    	and riu.is_active > 0;
    `;
    try {
      const resultTocResult: ResultsInnovationsUse[] = await this.query(
        queryData,
        [resultId],
      );
      return resultTocResult.length ? resultTocResult[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInnovationsUseRepository.name,
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
      -- Action Area Outcome - Innovation use specific fields
      riu.female_using 'Number of females',
      riu.male_using 'Number of males',
      group_concat(distinct concat('Unit of measure: ', rium.unit_of_measure, '; Quantity: ', rium.quantity) separator '\n') as 'Other quantitative measures'
    from results_innovations_use riu 
    left join result r on riu.results_id = r.id and r.is_active = 1
    left join results_innovations_use_measures rium on rium.result_innovation_use_id = riu.result_innovation_use_id and rium.is_active = 1
    where 
      riu.is_active = 1
      and r.result_code ${resultCodes.length ? `in (${resultCodes})` : '= 0'}
    group by 1,2,3,4
    ;
    `;
    try {
      const resultTocResult = await this.query(queryData);
      return resultTocResult;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInnovationsUse.name,
        error: error,
        debug: true,
      });
    }
  }
}
