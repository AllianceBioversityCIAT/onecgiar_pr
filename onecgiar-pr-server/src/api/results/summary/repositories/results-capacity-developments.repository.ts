import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultsCapacityDevelopments } from '../entities/results-capacity-developments.entity';

@Injectable()
export class ResultsCapacityDevelopmentsRepository extends Repository<ResultsCapacityDevelopments> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError
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
      const resultTocResult: ResultsCapacityDevelopments[] = await this.query(queryData, [resultId]);
      return resultTocResult.length ? resultTocResult[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsCapacityDevelopmentsRepository.name,
        error: error,
        debug: true,
      });
    }
  }

}