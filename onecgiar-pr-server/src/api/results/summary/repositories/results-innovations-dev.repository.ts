import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultsInnovationsDev } from '../entities/results-innovations-dev.entity';

@Injectable()
export class ResultsInnovationsDevRepository extends Repository<ResultsInnovationsDev> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError
  ) {
    super(ResultsInnovationsDev, dataSource.createEntityManager());
  }

  async InnovationDevExists(resultId: number) {
    const queryData = `
    SELECT
    	rid.result_innovation_dev_id,
    	rid.short_title,
    	rid.is_new_variety,
    	rid.number_of_varieties,
    	rid.innovation_developers,
    	rid.innovation_collaborators,
    	rid.readiness_level,
    	rid.evidences_justification,
    	rid.is_active,
    	rid.created_date,
    	rid.last_updated_date,
    	rid.results_id,
    	rid.version_id,
    	rid.created_by,
    	rid.last_updated_by,
    	rid.innovation_characterization_id,
    	rid.innovation_nature_id,
    	rid.innovation_readiness_level_id
    FROM
    	results_innovations_dev rid 
    WHERE 
    	rid.results_id = ?;
    `;
    try {
      const resultTocResult: ResultsInnovationsDev[] = await this.query(queryData, [resultId]);
      return resultTocResult.length ? resultTocResult[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInnovationsDevRepository.name,
        error: error,
        debug: true,
      });
    }
  }

}

