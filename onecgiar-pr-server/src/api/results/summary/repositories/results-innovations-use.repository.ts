import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsInnovationsUse } from '../entities/results-innovations-use.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import {
  ReplicableConfigInterface,
  ReplicableInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';

@Injectable()
export class ResultsInnovationsUseRepository
  extends Repository<ResultsInnovationsUse>
  implements ReplicableInterface<ResultsInnovationsUse>
{
  private readonly _logger: Logger = new Logger(
    ResultsInnovationsUseRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultsInnovationsUse, dataSource.createEntityManager());
  }

  async replicable(
    config: ReplicableConfigInterface<ResultsInnovationsUse>,
  ): Promise<ResultsInnovationsUse> {
    let final_data: ResultsInnovationsUse = null;
    try {
      if (config.f?.custonFunction) {
        const queryData = `
        select 
          null as result_innovation_use_id,
          riu.male_using,
          riu.female_using,
          riu.is_active,
          now() as created_date,
          null as last_updated_date,
          ? as results_id,
          ? as version_id,
          ? as created_by,
          null as last_updated_by
          from results_innovations_use riu where riu.results_id = ? and riu.is_active > 0
        `;
        const response = await (<Promise<ResultsInnovationsUse[]>>(
          this.query(queryData, [
            config.new_result_id,
            config.phase,
            config.user.id,
            config.old_result_id,
          ])
        ));
        const response_edit = <ResultsInnovationsUse>(
          config.f.custonFunction(response?.length > 0 ? response[0] : null)
        );
        final_data = await this.save(response_edit);
      } else {
        const queryData: string = `
        insert into results_innovations_use
        (
        male_using,
        female_using,
        is_active,
        created_date,
        last_updated_date,
        results_id,
        version_id,
        created_by,
        last_updated_by
        )
        select 
          riu.male_using,
          riu.female_using,
          riu.is_active,
          now() as created_date,
          null as last_updated_date,
          ? as results_id,
          ? as version_id,
          ? as created_by,
          null as last_updated_by
          from results_innovations_use riu where riu.results_id = ? and riu.is_active > 0`;
        await this.query(queryData, [
          config.new_result_id,
          config.phase,
          config.user.id,
          config.old_result_id,
        ]);

        const queryFind = `
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
        from results_innovations_use riu where riu.results_id = ?`;
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
      riu.female_using 'Number of females (Innovation use)',
      riu.male_using 'Number of males (Innovation use)',
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
