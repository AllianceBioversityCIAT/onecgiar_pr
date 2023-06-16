import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultsInnovationsDev } from '../entities/results-innovations-dev.entity';
import {
  ReplicableConfigInterface,
  ReplicableInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';

@Injectable()
export class ResultsInnovationsDevRepository
  extends Repository<ResultsInnovationsDev>
  implements ReplicableInterface<ResultsInnovationsDev>
{
  private readonly _logger: Logger = new Logger(
    ResultsInnovationsDevRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultsInnovationsDev, dataSource.createEntityManager());
  }

  async replicable(
    config: ReplicableConfigInterface<ResultsInnovationsDev>,
  ): Promise<ResultsInnovationsDev[]> {
    let final_data: ResultsInnovationsDev[] = null;
    try {
      if (config.f?.custonFunction) {
        const queryData = `
        select 
        null as result_innovation_dev_id,
        rid.short_title,
        rid.is_new_variety,
        rid.number_of_varieties,
        rid.innovation_developers,
        rid.innovation_collaborators,
        rid.readiness_level,
        rid.evidences_justification,
        rid.is_active,
        now() as created_date,
        null as last_updated_date,
        ? as results_id,
        ? as version_id,
        ? as created_by,
        null as last_updated_by,
        rid.innovation_characterization_id,
        rid.innovation_nature_id,
        rid.innovation_readiness_level_id,
        rid.innovation_acknowledgement,
        rid.innovation_pdf
        from results_innovations_dev rid where rid.results_id = ? and rid.is_active > 0
        `;
        const response = await (<Promise<ResultsInnovationsDev[]>>(
          this.query(queryData, [
            config.new_result_id,
            config.phase,
            config.user.id,
            config.old_result_id,
          ])
        ));
        const response_edit = <ResultsInnovationsDev[]>(
          config.f.custonFunction(response)
        );
        final_data = await this.save(response_edit);
      } else {
        const queryData: string = `
        insert into results_innovations_dev
        (
        short_title,
        is_new_variety,
        number_of_varieties,
        innovation_developers,
        innovation_collaborators,
        readiness_level,
        evidences_justification,
        is_active,
        created_date,
        last_updated_date,
        results_id,
        version_id,
        created_by,
        last_updated_by,
        innovation_characterization_id,
        innovation_nature_id,
        innovation_readiness_level_id,
        innovation_acknowledgement,
        innovation_pdf
        )
        select 
        rid.short_title,
        rid.is_new_variety,
        rid.number_of_varieties,
        rid.innovation_developers,
        rid.innovation_collaborators,
        rid.readiness_level,
        rid.evidences_justification,
        rid.is_active,
        now() as created_date,
        null as last_updated_date,
        ? as results_id,
        ? as version_id,
        ? as created_by,
        null as last_updated_by,
        rid.innovation_characterization_id,
        rid.innovation_nature_id,
        rid.innovation_readiness_level_id,
        rid.innovation_acknowledgement,
        rid.innovation_pdf
        from results_innovations_dev rid where rid.results_id = ? and rid.is_active > 0`;
        await this.query(queryData, [
          config.new_result_id,
          config.phase,
          config.user.id,
          config.old_result_id,
        ]);

        const queryFind = `
        select 
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
        from results_innovations_dev rid where rid.results_id = ?`;
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
