import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ResultsInnovationsUse } from '../entities/results-innovations-use.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import { predeterminedDateValidation } from '../../../../shared/utils/versioning.utils';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class ResultsInnovationsUseRepository
  extends BaseRepository<ResultsInnovationsUse>
  implements LogicalDelete<ResultsInnovationsUse>
{
  createQueries(
    config: ReplicableConfigInterface<ResultsInnovationsUse>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `select 
      null as result_innovation_use_id,
      riu.male_using,
      riu.female_using,
      riu.is_active,
      ${predeterminedDateValidation(
        config?.predetermined_date,
      )} as created_date,
      null as last_updated_date,
      ${config.new_result_id} as results_id,
      ${config.user.id} as created_by,
      null as last_updated_by
      from results_innovations_use riu where riu.results_id = ${
        config.old_result_id
      } and riu.is_active > 0`,
      insertQuery: `insert into results_innovations_use
      (
      male_using,
      female_using,
      is_active,
      created_date,
      last_updated_date,
      results_id,
      created_by,
      last_updated_by
      )
      select 
        riu.male_using,
        riu.female_using,
        riu.is_active,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date,
        null as last_updated_date,
        ${config.new_result_id} as results_id,
        ${config.user.id} as created_by,
        null as last_updated_by
        from results_innovations_use riu where riu.results_id = ${
          config.old_result_id
        } and riu.is_active > 0`,
      returnQuery: `select *
        from results_innovations_use riu where riu.results_id = ${config.new_result_id}`,
    };
  }
  private readonly _logger: Logger = new Logger(
    ResultsInnovationsUseRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultsInnovationsUse, dataSource.createEntityManager());
  }
  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete riu from results_innovations_use riu where riu.results_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsInnovationsUseRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultsInnovationsUse> {
    const queryData = `update results_innovations_use set is_active = 0 where results_id = ?`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsInnovationsUseRepository.name,
          debug: true,
        }),
      );
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
      ${phase ? `and r.version_id = ${phase}` : ''}
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

  async InnovDevExists(resultId: number) {
    const queryData = `
      SELECT
        riu.male_using,
        riu.female_using,
        riu.has_innovation_link
      FROM result r
      left join version v on r.version_id = v.id
      right JOIN results_innovations_use riu on riu.results_id = r.id and riu.is_active
      LEFT JOIN version previous_v on v.previous_phase = previous_v.id
      left join result previous_r on r.result_code = previous_r.result_code and previous_r.version_id = previous_v.id
      WHERE r.id = ? AND r.is_active;
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

  async getLinkedResultsByOrigin(originId: number): Promise<number[]> {
    const query = `
      SELECT linked_results_id
      FROM linked_result
      WHERE origin_results_id = ? AND is_active = TRUE;
    `;

    const results = await this.dataSource.query(query, [originId]);

    const linked_results: number[] = results.map((r: any) => r.linked_results_id);

    return linked_results;
  }
}
