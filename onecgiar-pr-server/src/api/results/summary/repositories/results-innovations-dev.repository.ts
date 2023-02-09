import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultsInnovationsDev } from '../entities/results-innovations-dev.entity';

@Injectable()
export class ResultsInnovationsDevRepository extends Repository<ResultsInnovationsDev> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
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
    	rid.innovation_readiness_level_id,
      rid.innovation_acknowledgement,
      rid.innovation_pdf
    FROM
    	results_innovations_dev rid 
    WHERE 
    	rid.results_id = ?;
    `;
    try {
      const resultTocResult: ResultsInnovationsDev[] = await this.query(
        queryData,
        [resultId],
      );
      return resultTocResult.length ? resultTocResult[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInnovationsDevRepository.name,
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
      -- Initiative Output - Innovation development specific fields
      rid.short_title 'Short title',
      concat(cic.name, ': ', cic.definition) as 'Innovation characterization',
      concat(cit.name, ': ', cit.definition) as 'Innovation nature',
      if(cit.code <> 12, 'Not applicable', if(coalesce(rid.is_new_variety, 0) = 1, 'Yes', 'No')) as 'New variety/breed?',
      if(cit.code <> 12, 'Not applicable', rid.number_of_varieties) 'Number of lines/varieties',
      rid.innovation_developers 'Innovation Developer(s)',
      rid.innovation_collaborators 'Innovation collaborator(s)',
      rid.innovation_acknowledgement 'Innovation acknowledgement',
      concat('Level ', cirl.id - 11, ': ', cirl.name) as 'Innovation readiness level',
      rid.evidences_justification 'Innovation readiness level justification',
      if(coalesce(rid.innovation_pdf, 0) = 1, 'Yes', 'No') as 'Published as IPSR PDF?'
    from results_innovations_dev rid
    left join result r on rid.results_id = r.id and r.is_active = 1
    left join clarisa_innovation_characteristic cic on rid.innovation_characterization_id = cic.id
    left join clarisa_innovation_type cit on rid.innovation_nature_id = cit.code
    left join clarisa_innovation_readiness_level cirl on rid.innovation_readiness_level_id = cirl.id
    where 
      rid.is_active = 1
      and r.result_code ${resultCodes.length ? `in (${resultCodes})` : '= 0'}
    ;
    `;
    try {
      const resultTocResult = await this.query(queryData);
      return resultTocResult;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInnovationsDevRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
