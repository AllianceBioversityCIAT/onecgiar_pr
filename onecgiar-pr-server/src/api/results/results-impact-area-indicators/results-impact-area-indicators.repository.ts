import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsImpactAreaIndicator } from './entities/results-impact-area-indicator.entity';
import { GetImpactIndicatorAreaDto } from './dto/get-impact-indicator-area.dto';


@Injectable()
export class ResultsImpactAreaIndicatorRepository extends Repository<ResultsImpactAreaIndicator> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError
  ) {
    super(ResultsImpactAreaIndicator, dataSource.createEntityManager());
  }

  async ResultsImpactAreaIndicatorExists(resultId: number, indicatorId: number) {
    const queryData = `
    SELECT
    	riai.results_impact_area_indicator_id,
    	riai.is_active,
    	riai.created_date,
    	riai.last_updated_date,
    	riai.impact_area_indicator_id,
    	riai.result_id,
    	riai.version_id,
    	riai.created_by,
    	riai.last_updated_by
    FROM
    	results_impact_area_indicators riai
    WHERE
    	riai.result_id = ?
    	and riai.impact_area_indicator_id = ?;
    `;
    try {
      const resultTocResult: ResultsImpactAreaIndicator[] = await this.query(queryData, [resultId, indicatorId]);
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
    	riai.version_id,
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
      const resultTocResult: GetImpactIndicatorAreaDto[] = await this.query(queryData, [resultId]);
      return resultTocResult;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsImpactAreaIndicatorRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateResultImpactAreaIndicators(resultId: number, impactId: number, indicatorsId: number[], userId: number) {
    const indicators = indicatorsId??[];
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
      if(indicators?.length){
        const upDateInactiveResult = await this.query(upDateInactive, [
          userId, resultId, impactId
        ]);
  
        return await this.query(upDateActive, [
          userId, resultId, impactId
        ]);
      }else{
        return await this.query(upDateAllInactive, [
          userId, resultId, impactId
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
}