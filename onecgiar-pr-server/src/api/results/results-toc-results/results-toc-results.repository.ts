import { Injectable } from '@nestjs/common';
import { env } from 'process';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsTocResult } from './entities/results-toc-result.entity';

@Injectable()
export class ResultsTocResultRepository extends Repository<ResultsTocResult> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsTocResult, dataSource.createEntityManager());
  }

  async getResultTocResultById(id: string) {
    const queryData = `
    SELECT
      rtr.result_toc_result_id,
      rtr.planned_result ,
      rtr.is_active ,
      rtr.created_date ,
      rtr.last_updated_date ,
      rtr.toc_result_id ,
      rtr.results_id ,
      rtr.action_area_outcome_id ,
      rtr.version_id ,
      rtr.created_by ,
      rtr.last_updated_by
    FROM
      results_toc_result rtr 
    WHERE rtr.result_toc_result_id = ?;
    `;
    try {
      const resultTocResult: ResultsTocResult[] = await this.query(queryData, [id]);
      return resultTocResult.length ? resultTocResult[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAllResultTocResult() {
    const queryData = `
    SELECT
      rtr.result_toc_result_id,
      rtr.planned_result ,
      rtr.is_active ,
      rtr.created_date ,
      rtr.last_updated_date ,
      rtr.toc_result_id ,
      rtr.results_id ,
      rtr.action_area_outcome_id ,
      rtr.version_id ,
      rtr.created_by ,
      rtr.last_updated_by
    FROM
      results_toc_result rtr;
    `;
    try {
      const resultTocResult: ResultsTocResult[] = await this.query(queryData);
      return resultTocResult;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getRTRById(RtRId: number, resultId: number, initiativeId: number) {

    const queryData = `
    SELECT
      rtr.result_toc_result_id,
      rtr.planned_result ,
      rtr.is_active ,
      rtr.created_date ,
      rtr.last_updated_date ,
      rtr.toc_result_id ,
      rtr.results_id ,
      rtr.action_area_outcome_id ,
      rtr.version_id ,
      rtr.created_by ,
      rtr.last_updated_by,
      ci.id as inititiative_id,
      ci.official_code,
      ci.name,
      ci.short_name,
      tr.toc_level_id
    FROM
      results_toc_result rtr
      left join clarisa_initiatives ci on ci.id = rtr.initiative_id 
      left JOIN toc_result tr on tr.toc_result_id = rtr.toc_result_id
    where rtr.result_toc_result_id = ${RtRId || null}
      or (rtr.initiative_id = ${initiativeId} and rtr.results_id = ${resultId});
    `;
    try {
      const resultTocResult: ResultsTocResult[] = await this.query(queryData);
      return resultTocResult?.length?resultTocResult[0]:undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getRTRPrimary(resultId: number, initiativeId: number[], isPrimary: boolean, initiativeArray?: number[]) {

    const queryData = `
    SELECT
      rtr.result_toc_result_id,
      rtr.planned_result ,
      rtr.is_active ,
      rtr.created_date ,
      rtr.last_updated_date ,
      rtr.toc_result_id ,
      rtr.results_id ,
      rtr.action_area_outcome_id ,
      rtr.version_id ,
      rtr.created_by ,
      rtr.last_updated_by,
      ci.id as initiative_id,
      ci.official_code,
      ci.name,
      ci.short_name,
      tr.toc_level_id
    FROM
      results_toc_result rtr	
      left JOIN toc_result tr on tr.toc_result_id = rtr.toc_result_id
      and tr.inititiative_id = rtr.initiative_id  
      left join clarisa_initiatives ci on ci.id = rtr.initiative_id  
    where rtr.results_id = ?
      and rtr.initiative_id ${isPrimary?'':'not'} in (${initiativeId?initiativeId.toString():null})
      ${isPrimary?'':`and rtr.initiative_id in (${initiativeArray.length?initiativeArray.toString():null})`}
      and rtr.is_active > 0;
    `;
    try {
      const resultTocResult: ResultsTocResult[] = await this.query(queryData, [resultId]);
      return resultTocResult;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async existsResultTocResult(resultId: number, initiativeId: number) {

    const queryData = `
    SELECT
      rtr.result_toc_result_id,
      rtr.planned_result ,
      rtr.is_active ,
      rtr.created_date ,
      rtr.last_updated_date ,
      rtr.toc_result_id ,
      rtr.results_id ,
      rtr.action_area_outcome_id ,
      rtr.version_id ,
      rtr.created_by ,
      rtr.last_updated_by,
      rtr.initiative_id 
    FROM
      results_toc_result rtr
    where rtr.results_id = ?
    and rtr.initiative_id = ?
      and rtr.is_active > 0;
    `;
    try {
      const resultTocResult: ResultsTocResult[] = await this.query(queryData, [resultId, initiativeId]);
      return resultTocResult?.length? resultTocResult[0]: undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getRTRPrimaryActionArea(resultId: number, initiativeId: number[], isPrimary: boolean, initiativeArray?: number[]) {

    const queryData = `
    SELECT
      rtr.result_toc_result_id,
      rtr.planned_result ,
      rtr.is_active ,
      rtr.created_date ,
      rtr.last_updated_date ,
      rtr.toc_result_id ,
      rtr.results_id ,
      rtr.action_area_outcome_id ,
      rtr.version_id ,
      rtr.created_by ,
      rtr.last_updated_by,
      ci.id as initiative_id,
      ci.official_code,
      ci.name,
      ci.short_name,
      4 as toc_level_id
    FROM
      results_toc_result rtr	
      inner join clarisa_initiatives ci on ci.id = rtr.initiative_id 
    where rtr.results_id = ?
      and rtr.initiative_id ${isPrimary?'':'not'} in (${initiativeId.length?initiativeId.toString():null})
      ${isPrimary?'':`and rtr.initiative_id in (${initiativeArray.length?initiativeArray.toString():null})`}
      and rtr.is_active > 0;
    `;
    try {

      const resultTocResult: ResultsTocResult[] = await this.query(queryData, [resultId]);
      return resultTocResult;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getRTRByIdNotInit(RtRId: number, resultId: number) {

    if(!RtRId){
      return undefined;
    }

    const queryData = `
    SELECT
    	rtr.result_toc_result_id,
    	rtr.planned_result ,
    	rtr.is_active ,
    	rtr.created_date ,
    	rtr.last_updated_date ,
    	rtr.toc_result_id ,
    	rtr.results_id ,
    	rtr.action_area_outcome_id ,
    	rtr.version_id ,
    	rtr.created_by ,
    	rtr.last_updated_by,
    	tr.inititiative_id,
    	ci.official_code,
    	ci.name,
    	ci.short_name,
    	tr.toc_level_id
    FROM
    	results_toc_result rtr
    inner JOIN toc_result tr on
    	tr.toc_result_id = rtr.toc_result_id
    inner join clarisa_initiatives ci on
    	ci.id = tr.inititiative_id
    where
    	tr.inititiative_id in (
    	SELECT
    		rbi.inititiative_id
    	from
    		results_by_inititiative rbi
    	where
    		rbi.initiative_role_id = 2
    		and rbi.result_id = ${resultId})
      and rtr.results_id = ${resultId}
      and rtr.result_toc_result_id = ${RtRId};
    `;
    try {
      const resultTocResult: ResultsTocResult[] = await this.query(queryData);
      return resultTocResult?.length?resultTocResult[0]:undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  

  async getAllResultTocResultByResultIdNoCurrentInit(resultId: number, initiativeId: number, resultLevel: number, toc_result_id: number, action_area_outcome_id: number) {
    const queryData = `
    SELECT
      rtr.result_toc_result_id,
      rtr.planned_result ,
      rtr.is_active ,
      rtr.created_date ,
      rtr.last_updated_date ,
      rtr.toc_result_id ,
      rtr.results_id ,
      rtr.action_area_outcome_id ,
      rtr.version_id ,
      rtr.created_by ,
      rtr.last_updated_by,
      rbi.inititiative_id,
      ci.official_code,
      ci.name,
      ci.short_name,
      tr.toc_level_id
    FROM
      results_toc_result rtr
      inner join results_by_inititiative rbi on rbi.result_id = rtr.results_id 	
      inner join clarisa_initiatives ci on ci.id = rbi.inititiative_id 
      left JOIN toc_result tr on tr.toc_result_id = rtr.toc_result_id 
    where rtr.results_id = ${resultId}
      and rbi.initiative_role_id = 1
      and rbi.inititiative_id <> ${initiativeId}
      and rtr.toc_result_id = ${toc_result_id}
      and rtr.is_active > 0;
    `,
    actonArea = `
    select
    	rtr.result_toc_result_id,
    	rtr.planned_result,
    	rtr.is_active,
    	rtr.created_date,
    	rtr.last_updated_date,
    	rtr.toc_result_id,
    	rtr.results_id,
    	rtr.action_area_outcome_id,
    	rtr.version_id,
    	rtr.created_by,
    	rtr.last_updated_by,
    	ci.id as initiative_id,
    	ci.official_code,
    	ci.short_name,
    	rtt.toc_level_id
    from
    	results_toc_result rtr
    left join (
    	select
    		null as toc_result_id,
    		ibs.initiativeId as inititiative_id ,
    		iaaoi.outcome_id as action_area_outcome_id,
    		caao.id,
    		caao.outcomeSMOcode as title,
    		caao.outcomeStatement as description,
    		4 as toc_level_id,
    		null as work_package_id
    	from
    		${env.DB_OST}.init_action_areas_out_indicators iaaoi
    	inner join ${env.DB_OST}.initiatives_by_stages ibs on
    		ibs.id = iaaoi.initvStgId
    	inner join ${env.DB_NAME}.clarisa_action_area_outcome caao on
    		caao.id = iaaoi.outcome_id
    		and ibs.initiativeId <> ?
    	WHERE
    		iaaoi.outcome_id is not null
    	GROUP by
    		ibs.initiativeId,
    		iaaoi.outcome_id) rtt on
    	rtt.action_area_outcome_id = rtr.action_area_outcome_id
    inner join clarisa_initiatives ci on
    	ci.id = rtt.inititiative_id
    WHERE
    	rtr.results_id = ?
    	and rtt.inititiative_id <> ?
    	and rtr.is_active > 0
      and rtr.action_area_outcome_id = ${action_area_outcome_id}
      ;
    `;
    try {
      const resultTocResult: ResultsTocResult[] = await this.query(resultLevel == 2? actonArea :queryData, [initiativeId, resultId, initiativeId]);
      return resultTocResult?.length?resultTocResult[0]:undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAllResultTocResultContributorsByResultIdAndInitId(resultId: number, initiativeArray: number[], ownerinitiativeId: number, resultLevel: number) {
    const init: number[] = initiativeArray || [];
    const queryData = `
    select 
      rtr.result_toc_result_id,
      rtr.planned_result,
      rtr.is_active,
      rtr.created_date,
      rtr.last_updated_date,
      rtr.toc_result_id,
      rtr.results_id,
      rtr.action_area_outcome_id,
      rtr.version_id,
      rtr.created_by,
      rtr.last_updated_by,
      ci.id as initiative_id,
      ci.official_code,
      ci.short_name,
      tr.toc_level_id
      from results_toc_result rtr 
      left JOIN toc_result tr on tr.toc_result_id = rtr.toc_result_id 
      inner join clarisa_initiatives ci on ci.id = tr.inititiative_id  
      WHERE rtr.results_id = ${resultId}
      and tr.inititiative_id in (${init?.length? init.toString(): null})
      and tr.inititiative_id <> ${ownerinitiativeId}
      and rtr.is_active > 0;
    `,
    actionArea = `
    select 
        rtr.result_toc_result_id,
        rtr.planned_result,
        rtr.is_active,
        rtr.created_date,
        rtr.last_updated_date,
        rtr.toc_result_id,
        rtr.results_id,
        rtr.action_area_outcome_id,
        rtr.version_id,
        rtr.created_by,
        rtr.last_updated_by,
        ci.id as initiative_id,
        ci.official_code,
        ci.short_name,
        rtt.toc_level_id
    from results_toc_result rtr 
        left join (select
            null as toc_result_id,
            ibs.initiativeId as inititiative_id ,
            iaaoi.outcome_id as action_area_outcome_id,
            caao.id,
            caao.outcomeSMOcode as title,
            caao.outcomeStatement as description,
            4 as toc_level_id,
            null as work_package_id
          from
            ${env.DB_OST}.init_action_areas_out_indicators iaaoi
          inner join ${env.DB_OST}.initiatives_by_stages ibs on
            ibs.id = iaaoi.initvStgId
          inner join ${env.DB_NAME}.clarisa_action_area_outcome caao on
            caao.id = iaaoi.outcome_id
          WHERE
            iaaoi.outcome_id is not null
            and ibs.initiativeId in (${init?.length? init.toString(): null})
            and ibs.initiativeId <> ?
          GROUP by
            ibs.initiativeId,
            iaaoi.outcome_id) rtt on rtt.action_area_outcome_id = rtr.action_area_outcome_id
      inner join clarisa_initiatives ci on ci.id = rtt.inititiative_id
        WHERE rtr.results_id = ?
        and rtt.inititiative_id in (${init?.length? init.toString(): null})
        and rtt.inititiative_id <> ?
        and rtr.is_active > 0;
    `;
    try {
      const resultTocResult: ResultsTocResult[] = await this.query(resultLevel == 2? actionArea : queryData, [ownerinitiativeId, resultId, ownerinitiativeId]);
      return resultTocResult;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateResultByInitiative(resultId: number, initiativeArray: number[], userId: number) {
    const initiative = initiativeArray??[];
    const upDateInactive = `
      update results_toc_result  
      set is_active = 0,
        last_updated_date = NOW(),
        planned_result = NULL,
        last_updated_by = ?
      where is_active > 0 
        and results_id = ?
        and initiative_id not in (${initiative.toString()});
    `;

    const upDateActive = `
      update results_toc_result  
      set is_active = 1,
        last_updated_date = NOW(),
        planned_result = NULL,
        last_updated_by = ?
      where results_id = ?
        and initiative_id in (${initiative.toString()});
    `;

    const upDateAllInactive = `
    update results_toc_result  
      set is_active = 0,
        last_updated_date = NOW(),
        planned_result = NULL,
        last_updated_by = ?
      where is_active > 0 
        and results_id = ?;
    `;

    try {
      if(initiative?.length){
        const upDateInactiveResult = await this.query(upDateInactive, [
          userId, resultId
        ]);
  
        return await this.query(upDateActive, [
          userId, resultId
        ]);
      }else{
        return await this.query(upDateAllInactive, [
          userId, resultId
        ]);
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: `updateResultByInitiative ${error}`,
        debug: true,
      });
    }
  }
}

