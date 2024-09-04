import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsImpactAreaIndicator } from './entities/results-impact-area-indicator.entity';
import { GetImpactIndicatorAreaDto } from './dto/get-impact-indicator-area.dto';
import { env } from 'process';
import {
  ReplicableConfigInterface,
  ReplicableInterface,
} from '../../../shared/globalInterfaces/replicable.interface';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';
import { predeterminedDateValidation } from '../../../shared/utils/versioning.utils';

@Injectable()
export class ResultsImpactAreaIndicatorRepository
  extends Repository<ResultsImpactAreaIndicator>
  implements
    ReplicableInterface<ResultsImpactAreaIndicator>,
    LogicalDelete<ResultsImpactAreaIndicator>
{
  private readonly _logger: Logger = new Logger(
    ResultsImpactAreaIndicatorRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultsImpactAreaIndicator, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete riai from results_impact_area_indicators riai where riai.result_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsImpactAreaIndicatorRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultsImpactAreaIndicator> {
    const queryData = `update results_impact_area_indicators riai set riai.is_active = 0 where riai.result_id = ? and riai.is_active > 0;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsImpactAreaIndicatorRepository.name,
          debug: true,
        }),
      );
  }

  async replicable(
    config: ReplicableConfigInterface<ResultsImpactAreaIndicator>,
  ): Promise<ResultsImpactAreaIndicator[]> {
    let final_data: ResultsImpactAreaIndicator[] = null;
    try {
      if (config.f?.custonFunction) {
        const queryData = `
        select
          null as results_impact_area_indicator_id,
          riai.is_active,
          ${predeterminedDateValidation(
            config?.predetermined_date,
          )} as created_date,
          null as last_updated_date,
          riai.impact_area_indicator_id,
          ? as result_id,
          ? as created_by,
          null as last_updated_by
          from results_impact_area_indicators riai where riai.result_id = ? and riai.is_active > 0
        `;
        const response = await (<Promise<ResultsImpactAreaIndicator[]>>(
          this.query(queryData, [
            config.new_result_id,
            config.user.id,
            config.old_result_id,
          ])
        ));
        const response_edit = <ResultsImpactAreaIndicator[]>(
          config.f.custonFunction(response)
        );
        final_data = await this.save(response_edit);
      } else {
        const queryData = `
        insert into results_impact_area_indicators 
        (
          is_active,
          created_date,
          last_updated_date,
          impact_area_indicator_id,
          result_id,
          created_by,
          last_updated_by
          )
        select
          riai.is_active,
          ${predeterminedDateValidation(
            config?.predetermined_date,
          )} as created_date,
          null as last_updated_date,
          riai.impact_area_indicator_id,
          ? as result_id,
          ? as created_by,
          null as last_updated_by
          from results_impact_area_indicators riai where riai.result_id = ? and riai.is_active > 0`;
        await this.query(queryData, [
          config.new_result_id,
          config.user.id,
          config.old_result_id,
        ]);

        const queryFind = `
        select
        riai.results_impact_area_indicator_id,
        riai.is_active,
        riai.created_date,
        riai.last_updated_date,
        riai.impact_area_indicator_id,
        riai.result_id,
        riai.created_by,
        riai.last_updated_by
        from results_impact_area_indicators riai where riai.result_id = ?`;
        final_data = await this.query(queryFind, [config.new_result_id]);
      }
    } catch (error) {
      if (config.f?.errorFunction) {
        config.f.errorFunction(error);
      } else {
        this._logger.error(error);
      }

      final_data = null;
    }

    config.f?.completeFunction?.({ ...final_data });

    return final_data;
  }

  async ResultsImpactAreaIndicatorExists(
    resultId: number,
    indicatorId: number,
  ) {
    const queryData = `
    SELECT
    	riai.results_impact_area_indicator_id,
    	riai.is_active,
    	riai.created_date,
    	riai.last_updated_date,
    	riai.impact_area_indicator_id,
    	riai.result_id,
    	riai.created_by,
    	riai.last_updated_by
    FROM
    	results_impact_area_indicators riai
    WHERE
    	riai.result_id = ?
    	and riai.impact_area_indicator_id = ?;
    `;
    try {
      const resultTocResult: ResultsImpactAreaIndicator[] = await this.query(
        queryData,
        [resultId, indicatorId],
      );
      return resultTocResult.length ? resultTocResult[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsImpactAreaIndicatorRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async ResultsImpactAreaIndicatorByResultId(resultId: number) {
    const queryData = `
    SELECT
    	riai.results_impact_area_indicator_id,
    	riai.is_active,
    	riai.created_date,
    	riai.last_updated_date,
    	riai.impact_area_indicator_id as id,
    	riai.result_id,
    	riai.created_by,
    	riai.last_updated_by,
    	ciai.impact_area_id,
    	ciai.indicator_statement 
    FROM
    	results_impact_area_indicators riai
    	inner join clarisa_impact_area_indicator ciai on ciai.id = riai.impact_area_indicator_id 
    WHERE
    	riai.result_id = ?
      and riai.is_active > 0;
    `;
    try {
      const resultTocResult: GetImpactIndicatorAreaDto[] = await this.query(
        queryData,
        [resultId],
      );
      return resultTocResult;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsImpactAreaIndicatorRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateResultImpactAreaIndicators(
    resultId: number,
    impactId: number,
    indicatorsId: number[],
    userId: number,
  ) {
    const indicators = indicatorsId ?? [];
    const upDateInactive = `
    update results_impact_area_indicators riai
	    inner join clarisa_impact_area_indicator ciai on ciai.id = riai.impact_area_indicator_id 
	    inner join clarisa_impact_areas cia on cia.id = ciai.impact_area_id 
        set riai.is_active  = 0,
          riai.last_updated_date  = NOW(),
          riai.last_updated_by  = ?
        where riai.is_active > 0 
          and riai.result_id  = ?
          and riai.impact_area_indicator_id not in (${indicators.toString()})
          and cia.id = ?;
    `;

    const upDateActive = `
    update results_impact_area_indicators riai
	  inner join clarisa_impact_area_indicator ciai on ciai.id = riai.impact_area_indicator_id 
	  inner join clarisa_impact_areas cia on cia.id = ciai.impact_area_id 
      set riai.is_active  = 1,
        riai.last_updated_date  = NOW(),
        riai.last_updated_by  = ?
      where riai.result_id  = ?
        and riai.impact_area_indicator_id in (${indicators.toString()})
        and cia.id = ?;
    `;

    const upDateAllInactive = `
    update results_impact_area_indicators riai
	  inner join clarisa_impact_area_indicator ciai on ciai.id = riai.impact_area_indicator_id 
	  inner join clarisa_impact_areas cia on cia.id = ciai.impact_area_id 
      set riai.is_active  = 0,
        riai.last_updated_date  = NOW(),
        riai.last_updated_by  = ?
      where riai.is_active > 0 
        and riai.result_id  = ?
        and cia.id = ?;
    `;

    try {
      if (indicators?.length) {
        await this.query(upDateInactive, [userId, resultId, impactId]);

        return await this.query(upDateActive, [userId, resultId, impactId]);
      } else {
        return await this.query(upDateAllInactive, [
          userId,
          resultId,
          impactId,
        ]);
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsImpactAreaIndicatorRepository.name,
        error: `updateResultImpactAreaIndicators ${error}`,
        debug: true,
      });
    }
  }

  async mapImpactAreaOutcomeToc(coreId: number, initId: number) {
    try {
      const query = `
      SELECT
        DISTINCT cgt.id AS impact_area_indicator_id
      FROM
        ${env.DB_OST}.clarisa_global_targets cgt
        LEFT JOIN ${env.DB_OST}.toc_impact_area_results_global_targets tiargt ON tiargt.global_target_id  = cgt.id
        LEFT JOIN ${env.DB_OST}.toc_impact_area_results tiar ON tiar.toc_result_id = tiargt.impact_area_toc_result_id
        LEFT JOIN ${env.DB_OST}.toc_results_impact_area_results triar ON triar.impact_area_toc_result_id = tiar.toc_result_id
        LEFT JOIN ${env.DB_OST}.toc_results tr1 ON tr1.toc_result_id = triar.toc_result_id 
      WHERE
        tiargt.is_active = 1
        AND tr1.toc_result_id IN (
          SELECT
              tr2.toc_internal_id
          FROM
              prdb.toc_result tr2
              LEFT JOIN prdb.results_toc_result rtr ON rtr.toc_result_id = tr2.toc_result_id
              AND rtr.is_active = 1
          WHERE
              rtr.results_id = ?
              AND rtr.initiative_id = ?
              AND tr2.inititiative_id = ?
              AND tr2.is_active = 1
        );
      `;

      const impactAreaOutcome: any[] = await this.dataSource.query(query, [
        coreId,
        initId,
        initId,
      ]);

      return impactAreaOutcome;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsImpactAreaIndicatorRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
