import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsImpactAreaTarget } from './entities/results-impact-area-target.entity';


@Injectable()
export class ResultsImpactAreaTargetRepository extends Repository<ResultsImpactAreaTarget> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError
  ) {
    super(ResultsImpactAreaTarget, dataSource.createEntityManager());
  }

  async resultsImpactAreaTargetExists(resultId: number, targetId: number) {
    const queryData = `
    SELECT
      riat.result_impact_area_target_id,
      riat.is_active,
      riat.created_date,
      riat.last_updated_date,
      riat.result_id,
      riat.impact_area_target_id,
      riat.version_id,
      riat.created_by,
      riat.last_updated_by
    FROM
      results_impact_area_target riat
    WHERE
      riat.result_id = ?
      and riat.impact_area_target_id = ?;
    `;
    try {
      const resultTocResult: ResultsImpactAreaTarget[] = await this.query(queryData, [resultId, targetId]);
      return resultTocResult.length ? resultTocResult[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsImpactAreaTargetRepository.name,
        error: error,
        debug: true,
      });
    }
  }


  async resultsImpactAreaTargetByInstitutions(resultId: number) {
    const queryData = `
    SELECT
      riat.result_impact_area_target_id,
      riat.is_active,
      riat.created_date,
      riat.last_updated_date,
      riat.result_id,
      riat.impact_area_target_id,
      riat.version_id,
      riat.created_by,
      riat.last_updated_by
    FROM
      results_impact_area_target riat
    WHERE
      riat.result_id = ?;
    `;
    try {
      const resultTocResult: ResultsImpactAreaTarget[] = await this.query(queryData, [resultId]);
      return resultTocResult;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsImpactAreaTargetRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateResultImpactAreaTarget(resultId: number, impactId: number, targetId: number[], userId: number) {
    const target = targetId??[];
    const upDateInactive = `
    update results_impact_area_target riat
    inner join clarisa_global_targets cgt on cgt.targetId = riat.impact_area_target_id  
    inner join clarisa_impact_areas cia on cia.id = cgt.impactAreaId 
      set riat.is_active  = 0,
        riat.last_updated_date  = NOW(),
        riat.last_updated_by  = ?
      where riat.is_active > 0 
        and riat.result_id  = ?
        and riat.impact_area_target_id  not in (${target.toString()})
        and cia.id = ?;
    `;

    const upDateActive = `
    update results_impact_area_target riat
    inner join clarisa_global_targets cgt on cgt.targetId = riat.impact_area_target_id  
    inner join clarisa_impact_areas cia on cia.id = cgt.impactAreaId 
      set riat.is_active  = 0,
        riat.last_updated_date  = NOW(),
        riat.last_updated_by  = ?
      where riat.result_id  = ?
        and riat.impact_area_target_id in (${target.toString()})
        and cia.id = ?;
    `;

    const upDateAllInactive = `
    update results_impact_area_target riat
    inner join clarisa_global_targets cgt on cgt.targetId = riat.impact_area_target_id  
    inner join clarisa_impact_areas cia on cia.id = cgt.impactAreaId 
      set riat.is_active  = 0,
        riat.last_updated_date  = NOW(),
        riat.last_updated_by  = ?
      where riat.is_active > 0 
        and riat.result_id  = ?
        and cia.id = ?;
    `;

    try {
      if(target?.length){
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
        className: ResultsImpactAreaTargetRepository.name,
        error: `updateResultByInitiative ${error}`,
        debug: true,
      });
    }
  }
}


