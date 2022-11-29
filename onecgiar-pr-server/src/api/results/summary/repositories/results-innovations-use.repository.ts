import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsInnovationsUse } from '../entities/results-innovations-use.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';

@Injectable()
export class ResultsInnovationsUseRepository extends Repository<ResultsInnovationsUse> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError
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
      const resultTocResult: ResultsInnovationsUse[] = await this.query(queryData, [resultId]);
      return resultTocResult.length ? resultTocResult[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInnovationsUseRepository.name,
        error: error,
        debug: true,
      });
    }
  }

}

