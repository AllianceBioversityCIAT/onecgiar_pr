import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { env } from 'process';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsTocResult } from './entities/results-toc-result.entity';
import {
  ReplicableConfigInterface,
  ReplicableInterface,
} from '../../../shared/globalInterfaces/replicable.interface';
import { ResultsTocResultIndicatorsRepository } from './results-toc-results-indicators.repository';
import { ResultsTocImpactAreaTargetRepository } from './result-toc-impact-area-repository';
import { ResultsTocSdgTargetRepository } from './result-toc-sdg-target-repository';
import { ResultsSdgTargetRepository } from './results-sdg-targets.respository';
import { ResultsActionAreaOutcomeRepository } from './result-toc-action-area.repository';
import { ResultsTocTargetIndicatorRepository } from './result-toc-result-target-indicator.repository';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';
import { CreateResultsTocResultDto } from './dto/create-results-toc-result.dto';
import { predeterminedDateValidation } from '../../../shared/utils/versioning.utils';

@Injectable()
export class ResultsTocResultRepository
  extends Repository<ResultsTocResult>
  implements
    ReplicableInterface<ResultsTocResult>,
    LogicalDelete<ResultsTocResult>
{
  private readonly _logger: Logger = new Logger(
    ResultsTocResultRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
    private readonly _resultsTocResultIndicator: ResultsTocResultIndicatorsRepository,
    private readonly _resultsTocImpactAreaTargetRepository: ResultsTocImpactAreaTargetRepository,
    private readonly _resultsTocSdgTargetRepository: ResultsTocSdgTargetRepository,
    private readonly _resultsSdgTargetRepository: ResultsSdgTargetRepository,
    private readonly _resultActionAreaRepository: ResultsActionAreaOutcomeRepository,
    private readonly _resultTocIndicatorTargetRepository: ResultsTocTargetIndicatorRepository,
  ) {
    super(ResultsTocResult, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete rtr from results_toc_result rtr where rtr.results_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsTocResultRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultsTocResult> {
    const dataQuery = `update results_toc_result rtr set rtr.is_active = 0 where rtr.results_id = ? and rtr.is_active > 0;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsTocResultRepository.name,
          debug: true,
        }),
      );
  }

  async replicable(
    config: ReplicableConfigInterface<ResultsTocResult>,
  ): Promise<ResultsTocResult[]> {
    let final_data: ResultsTocResult[] = null;
    try {
      if (config.f?.custonFunction) {
        const queryData = `
        select 
          null as result_toc_result_id,
          null as planned_result,
          rtr.is_active,
          ${predeterminedDateValidation(
            config?.predetermined_date,
          )} as created_date,
          null as last_updated_date,
          null as toc_result_id,
          ? as results_id,
          null as action_area_outcome_id,
          ? as created_by,
          null as last_updated_by,
          rtr.initiative_id,
          null as action_area_id
          from results_toc_result rtr 
          WHERE rtr.results_id = ? and rtr.is_active > 0
        `;
        const response = await (<Promise<ResultsTocResult[]>>(
          this.query(queryData, [
            config.new_result_id,
            config.user.id,
            config.old_result_id,
          ])
        ));
        const response_edit = <ResultsTocResult[]>(
          config.f.custonFunction(response)
        );
        final_data = await this.save(response_edit);
      } else {
        const queryData = `
        insert into results_toc_result 
        (
        planned_result,
        is_active,
        created_date,
        last_updated_date,
        toc_result_id,
        results_id,
        action_area_outcome_id,
        created_by,
        last_updated_by,
        initiative_id,
        action_area_id
        )
        SELECT 
        null as planned_result,
        rtr.is_active,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date,
        null as last_updated_date,
        null as toc_result_id,
        ? as results_id,
        null as action_area_outcome_id,
        ? as created_by,
        null as last_updated_by,
        rtr.initiative_id,
        null as action_area_id
        from results_toc_result rtr 
        WHERE rtr.results_id = ? and rtr.is_active > 0`;
        await this.query(queryData, [
          config.new_result_id,
          config.user.id,
          config.old_result_id,
        ]);

        const queryFind = `
        select 
          rtr.result_toc_result_id,
          rtr.planned_result,
          rtr.is_active,
          rtr.created_date,
          rtr.last_updated_date,
          rtr.toc_result_id,
          rtr.results_id,
          rtr.action_area_outcome_id,
          rtr.created_by,
          rtr.last_updated_by,
          rtr.initiative_id,
          rtr.action_area_id
          from results_toc_result rtr 
          WHERE rtr.results_id = ?`;
        final_data = await this.query(queryFind, [config.new_result_id]);
      }
    } catch (error) {
      config.f?.errorFunction
        ? config.f.errorFunction(error)
        : this._logger.error(error);
      final_data = null;
    }

    config.f?.completeFunction?.({ ...final_data });

    return final_data;
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
      rtr.created_by ,
      rtr.last_updated_by
    FROM
      results_toc_result rtr 
    WHERE rtr.result_toc_result_id = ?;
    `;
    try {
      const resultTocResult: ResultsTocResult[] = await this.query(queryData, [
        id,
      ]);
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

  async getRTRById(rtrId: number) {
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
      rtr.created_by ,
      rtr.last_updated_by,
      ci.id as inititiative_id,
      ci.official_code,
      ci.name,
      ci.short_name,
      tr.result_type as toc_level_id
    FROM
      results_toc_result rtr
      left join clarisa_initiatives ci on ci.id = rtr.initiative_id 
      left JOIN ${env.DB_TOC}.toc_results tr on tr.id = rtr.toc_result_id
    where rtr.result_toc_result_id = ${rtrId || null};
    `;
    try {
      const resultTocResult: ResultsTocResult[] = await this.query(queryData);
      return resultTocResult?.length ? resultTocResult[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getNewRTRById(RtRId: number, resultId: number, initiativeId: number) {
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
      rtr.created_by ,
      rtr.last_updated_by,
      ci.id as inititiative_id,
      ci.official_code,
      ci.name,
      ci.short_name,
      tr.result_type as toc_level_id
    FROM
      results_toc_result rtr
      left join clarisa_initiatives ci on ci.id = rtr.initiative_id 
      left JOIN ${env.DB_TOC}.toc_results tr on tr.id = rtr.toc_result_id
    where ${
      RtRId
        ? `rtr.result_toc_result_id = ${RtRId}`
        : `rtr.initiative_id = ${initiativeId} and rtr.results_id = ${resultId}`
    };
    `;
    try {
      const resultTocResult: ResultsTocResult[] = await this.query(queryData);
      return resultTocResult?.length ? resultTocResult[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getRTRPrimary(
    resultId: number,
    initiativeId: number[],
    isPrimary: boolean,
    initiativeArray?: number[],
  ) {
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
      rtr.created_by ,
      rtr.last_updated_by,
      rtr.toc_progressive_narrative,
      ci.id as initiative_id,
      ci.official_code,
      ci.name,
      ci.short_name,
      tr.result_type as toc_level_id
    FROM
      results_toc_result rtr	
      left JOIN ${env.DB_TOC}.toc_results tr on tr.id = rtr.toc_result_id
      left join clarisa_initiatives ci on ci.id = rtr.initiative_id
    where rtr.results_id = ?
      and rtr.initiative_id ${isPrimary ? '' : 'not'} in (${
      initiativeId ? initiativeId.toString() : null
    })
      ${
        isPrimary
          ? ''
          : `and rtr.initiative_id in (${
              initiativeArray.length ? initiativeArray.toString() : null
            })`
      }
      and rtr.is_active > 0;
    `;
    try {
      const resultTocResult: ResultsTocResult[] = await this.query(queryData, [
        resultId,
      ]);
      return resultTocResult;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getWpExtraInfo(
    resultId: number,
    toc_result_id: number,
    initiativeId: number,
  ) {
    const queryData = `
    SELECT
      tr.result_title,
      IFNULL(wp.acronym, NULL) AS wp_acronym
    FROM
      results_toc_result rtr	
      left JOIN ${env.DB_TOC}.toc_results tr on tr.id = rtr.toc_result_id
      left join clarisa_initiatives ci on ci.id = rtr.initiative_id
      left join ${env.DB_OST}.work_packages wp on wp.id = tr.work_packages_id
    where rtr.results_id = ${resultId}
      and rtr.initiative_id = ${initiativeId}
      and ${toc_result_id ? `rtr.toc_result_id = ${toc_result_id}` : ``}
      and rtr.is_active > 0;
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

  async getWpInformation(resultId: number, toc_result_id: number) {
    const queryData = `
      select
        r.description,
        r.title,
        r.result_code,
        v.phase_name,
        v.id AS version_id,
        rt.name AS result_type_name,
        rtr.toc_progressive_narrative
      from
        results_toc_result rtr
        join result r on r.id = rtr.results_id
        join version v on v.id = r.version_id
        join result_type rt ON rt.id = r.result_type_id
      where
        rtr.results_id = ${resultId}
        AND rtr.toc_result_id = ${toc_result_id}
        AND rtr.is_active = 1
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
      rtr.created_by ,
      rtr.last_updated_by,
      rtr.initiative_id 
    FROM
      results_toc_result rtr
    where rtr.results_id = ?
    and rtr.initiative_id = ?;
    `;
    try {
      const resultTocResult: ResultsTocResult[] = await this.query(queryData, [
        resultId,
        initiativeId,
      ]);
      return resultTocResult?.length ? resultTocResult[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getRTRPrimaryActionArea(
    resultId: number,
    initiativeId: number[],
    isPrimary: boolean,
    initiativeArray?: number[],
  ) {
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
      and rtr.initiative_id ${isPrimary ? '' : 'not'} in (${
      initiativeId.length ? initiativeId.toString() : null
    })
      ${
        isPrimary
          ? ''
          : `and rtr.initiative_id in (${
              initiativeArray.length ? initiativeArray.toString() : null
            })`
      }
      and rtr.is_active > 0;
    `;
    try {
      const resultTocResult: ResultsTocResult[] = await this.query(queryData, [
        resultId,
      ]);
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
    if (!RtRId) {
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
      return resultTocResult?.length ? resultTocResult[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAllResultTocResultByResultIdNoCurrentInit(
    resultId: number,
    initiativeId: number,
    resultLevel: number,
    toc_result_id: number,
    action_area_outcome_id: number,
  ) {
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
      const resultTocResult: ResultsTocResult[] = await this.query(
        resultLevel == 2 ? actonArea : queryData,
        [initiativeId, resultId, initiativeId],
      );
      return resultTocResult?.length ? resultTocResult[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAllResultTocResultContributorsByResultIdAndInitId(
    resultId: number,
    initiativeArray: number[],
    ownerinitiativeId: number,
    resultLevel: number,
  ) {
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
      and tr.inititiative_id in (${init?.length ? init.toString() : null})
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
            and ibs.initiativeId in (${init?.length ? init.toString() : null})
            and ibs.initiativeId <> ?
          GROUP by
            ibs.initiativeId,
            iaaoi.outcome_id) rtt on rtt.action_area_outcome_id = rtr.action_area_outcome_id
      inner join clarisa_initiatives ci on ci.id = rtt.inititiative_id
        WHERE rtr.results_id = ?
        and rtt.inititiative_id in (${init?.length ? init.toString() : null})
        and rtt.inititiative_id <> ?
        and rtr.is_active > 0;
    `;
    try {
      const resultTocResult: ResultsTocResult[] = await this.query(
        resultLevel == 2 ? actionArea : queryData,
        [ownerinitiativeId, resultId, ownerinitiativeId],
      );
      return resultTocResult;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateResultByInitiative(
    resultId: number,
    initiativeArray: number[],
    userId: number,
  ) {
    const initiative = initiativeArray ?? [];
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
       /* planned_result = NULL, */
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
      if (initiative?.length) {
        await this.query(upDateInactive, [userId, resultId]);

        return await this.query(upDateActive, [userId, resultId]);
      } else {
        return await this.query(upDateAllInactive, [userId, resultId]);
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: `updateResultByInitiative ${error}`,
        debug: true,
      });
    }
  }

  async getResultTocResultByResultId(
    resultId: number,
    toc_result_id: number,
    init: number,
  ) {
    try {
      let IndicatorTargetData = [];
      if (resultId == null && toc_result_id == null && init == null) {
        return;
      }

      const resultInfo = await this.query(`
      select
          *
      from
          result r
          join version v on r.version_id = v.id
          join result_type rt on rt.id = r.result_type_id
      where
          r.id = ${resultId}
          and r.is_active = 1;
      `);

      const IndicatorTarget = await this.query(`
      select
          *
      from
          results_toc_result
      where
          results_id = ${resultId}
          and is_active = 1
          and toc_result_id = ${toc_result_id}
          and initiative_id = ${init};
      `);

      const queryDataIndicators = `
      select
          tr.phase,
          tri.related_node_id as toc_results_indicator_id,
          tri.indicator_description,
          tri.unit_messurament,
          tri.location,
          tri.type_value,
          tri.type_name as 'statement'
      from
          ${env.DB_TOC}.toc_results tr
          join ${env.DB_TOC}.toc_results_indicators tri on tri.toc_results_id = tr.id
          and tri.is_active = 1
      where
          tr.id = ?
          and tr.phase = (
              select
                  v.toc_pahse_id
              from
                  result r
                  join version v on r.version_id = v.id
              where
                  r.id = ?
          );
      `;

      // * Validate if the result has a target
      if (IndicatorTarget.length) {
        const IndicatorTargetId = IndicatorTarget[0].result_toc_result_id;
        IndicatorTargetData = await this.query(queryDataIndicators, [
          toc_result_id,
          resultId,
        ]);

        // * Iterate the indicators
        for (const itemIndicator of IndicatorTargetData) {
          itemIndicator.result = resultInfo[0];

          // * Validate if the indicator has a location equal to country
          if (itemIndicator.location == 'country') {
            const regions = `select * 
            from clarisa_countries cc WHERE 
              cc.id  in (select trir.clarisa_countries_id  from Integration_information.toc_result_indicator_country trir where trir.toc_result_id =?)`;
            const region = await this.query(regions, [
              itemIndicator.toc_results_indicator_id,
            ]);
            let full_region = null;
            region.map((item) => (full_region += `${item.name}`));

            itemIndicator.location = `Country/ies`;
            if (full_region != null) {
              itemIndicator.full_geo = full_region;
            } else {
              itemIndicator.full_geo = 'No country/ies provided';
            }
          }

          // * Validate if the indicator has a location equal to regional
          if (itemIndicator.location == 'regional') {
            const regions = `select * 
                                from clarisa_regions cr WHERE 
                                      cr.um49Code in (select trir.clarisa_regions_id  from Integration_information.toc_result_indicator_region trir where trir.toc_result_id = ?)`;
            const region = await this.query(regions, [
              itemIndicator.toc_results_indicator_id,
            ]);
            let full_region = null;
            region.map((item) => (full_region += `${item.name}`));

            itemIndicator.location = `Regional`;
            if (full_region != null) {
              itemIndicator.full_geo = '' + full_region;
            } else {
              itemIndicator.full_geo = ' No region(s) provided';
            }
          }

          // * Validate the type of the indicator
          if (
            itemIndicator.type_value ==
            'Change in the capacity of key (a) Individuals, (b) Organizations (government, civil society and private sector), and (c) Networks (e.g. multi-stakeholder platforms).'
          ) {
            itemIndicator.type = 'Capacity change';
            itemIndicator.number_result_type = 3;
          } else if (itemIndicator.type_value == 'Number of innovations') {
            itemIndicator.type = 'Innovation Development';
            itemIndicator.number_result_type = 7;
          } else if (
            itemIndicator.type_value ==
            'Number of people trained, long-term (including Masters and PhDs) and short-term, disaggregated by gender'
          ) {
            itemIndicator.type = 'Capacity Sharing for Development';
            itemIndicator.number_result_type = 5;
          } else if (
            itemIndicator.type_value == 'Number of peer reviewed journal papers'
          ) {
            itemIndicator.type = 'Knowledge Product';
            itemIndicator.number_result_type = 6;
          } else if (
            itemIndicator.type_value ==
            'Number of other information products/data assets (including: reports, briefs, extension, training and e-learning content and other materials, books and book chapters, data and databases, data collection and analysis tools (e.g. models and survey tools), video, audio and images, graphics, maps, and other GIS outputs, computer software, models and code, digital and mobile applications, and web-based services (e.g. websites, data portals, online platforms)'
          ) {
            itemIndicator.type = 'Knowledge Product';
            itemIndicator.number_result_type = 6;
          } else if (
            itemIndicator.type_value ==
            'Number of policies/ strategies/ laws/ regulations/ budgets/ investments/ curricula modified in design or implementation, informed by CGIAR research.'
          ) {
            itemIndicator.type = 'Policy change';
            itemIndicator.number_result_type = 1;
          } else if (
            itemIndicator.type_value ==
            'Number of beneficiaries using the CGIAR innovation, disaggregated by gender.'
          ) {
            itemIndicator.type = 'Innovation use';
            itemIndicator.number_result_type = 2;
          } else if (
            itemIndicator.type_value ==
            'Other quantitative measure of CGIAR innovation use (e.g. area)'
          ) {
            itemIndicator.type = 'Innovation use';
            itemIndicator.number_result_type = 2;
          } else if (itemIndicator.type_value == 'Altmetric score') {
            itemIndicator.type = 'Other outcome';
            itemIndicator.number_result_type = 4;
          } else {
            itemIndicator.type = 'N/A';
            itemIndicator.number_result_type = 0;
          }

          // * Validate if the indicator has a target
          const queryTargetInfo = `
            SELECT
              trit.target_value,
              trit.target_date,
              trit.number_target
            FROM
              Integration_information.toc_result_indicator_target trit
            WHERE
              trit.toc_result_indicator_id = ?
              AND YEAR(DATE(trit.target_date)) = (
                    SELECT
                      v1.phase_year
                    FROM
                        prdb.version v1
                    WHERE
                      v1.phase_name LIKE '%Reporting%' 
                      AND v1.is_active = 1 
                      AND v1.status = 1
                );
            `;
          const queryTargetInfoData = await this.query(queryTargetInfo, [
            itemIndicator.toc_results_indicator_id,
          ]);
          itemIndicator.targets = queryTargetInfoData;

          // * Validate if the indicator has a target contributing
          const queryTargetContributing = `
              select * from results_toc_result_indicators
                where results_toc_results_id = ? and toc_results_indicator_id = ?;
            `;
          const queryTargetContributingData = await this.query(
            queryTargetContributing,
            [IndicatorTargetId, itemIndicator.toc_results_indicator_id],
          );

          // * Validate if the indicator has a target contributing
          if (queryTargetContributingData.length) {
            itemIndicator.targets.forEach(async (element) => {
              const queryContributingPrimary = ` 
                  select * from result_indicators_targets 
                    where result_toc_result_indicator_id = ? and number_target = ?;
                `;

              const queryContributingPrimaryData = await this.query(
                queryContributingPrimary,
                [
                  queryTargetContributingData[0].result_toc_result_indicator_id,
                  element.number_target,
                ],
              );

              if (queryContributingPrimaryData.length) {
                element.contributing =
                  queryContributingPrimaryData[0].contributing_indicator;
                element.target_progress_narrative =
                  queryContributingPrimaryData[0].target_progress_narrative;
                element.indicator_question =
                  queryContributingPrimaryData[0].indicator_question;
              }
              const queryTargetContributing = `
                select
                  r.description,
                  r.title,
                  r.result_code,
                  v.phase_name,
                  v.id AS version_id,
                  rt.name AS result_type_name,
                  rit.contributing_indicator,
                  rit.target_progress_narrative
                from
                  results_toc_result rtr
                  join results_toc_result_indicators rtri on rtri.results_toc_results_id = rtr.result_toc_result_id
                  and rtri.is_active = 1
                  join result_indicators_targets rit on rit.result_toc_result_indicator_id = rtri.result_toc_result_indicator_id
                  and rit.is_active = 1
                  join result r on r.id = rtr.results_id
                  join version v on v.id = r.version_id
                  join result_type rt ON rt.id = r.result_type_id
                where
                  rtri.results_toc_results_id = ?
                  and rtri.toc_results_indicator_id = ?
                  and rit.number_target = ?
                  and rtr.is_active = 1
                  and r.is_active = 1
                  AND rit.indicator_question = 1;
                `;

              const queryTargetothercontributing = await this.query(
                queryTargetContributing,
                [
                  IndicatorTargetId,
                  itemIndicator.toc_results_indicator_id,
                  element.number_target,
                ],
              );

              element.results_contributing = queryTargetothercontributing;

              if (Number(element.target_value)) {
                itemIndicator.is_calculable = true;
                let auxTotal = 0;
                if (queryTargetothercontributing.length) {
                  queryTargetothercontributing.forEach((elementC) => {
                    auxTotal =
                      auxTotal + Number(elementC.contributing_indicator);
                  });
                }
                itemIndicator.total = auxTotal;
              } else {
                itemIndicator.targets.forEach(async (element) => {
                  element.contributing =
                    queryContributingPrimaryData[0].contributing_indicator;
                  element.target_progress_narrative =
                    queryContributingPrimaryData[0].target_progress_narrative;
                  element.indicator_question =
                    queryContributingPrimaryData[0].indicator_question;
                  const queryTargetContributing = `
                select
                  r.description,
                  r.title,
                  r.result_code,
                  v.phase_name,
                  v.id AS version_id,
                  rt.name AS result_type_name,
                  rit.contributing_indicator,
                  rit.target_progress_narrative
                from
                  results_toc_result rtr
                  join results_toc_result_indicators rtri on rtri.results_toc_results_id = rtr.result_toc_result_id
                  and rtri.is_active = 1
                  join result_indicators_targets rit on rit.result_toc_result_indicator_id = rtri.result_toc_result_indicator_id
                  and rit.is_active = 1
                  join result r on r.id = rtr.results_id
                  join version v on v.id = r.version_id
                  join result_type rt ON rt.id = r.result_type_id
                where
                  rtri.toc_results_indicator_id = ?
                  and rit.number_target = ?
                  and rtr.is_active = 1
                  and r.is_active = 1
                  AND rit.indicator_question = 1;
                    `;

                  const queryTargetothercontributing = await this.query(
                    queryTargetContributing,
                    [
                      itemIndicator.toc_results_indicator_id,
                      element.number_target,
                    ],
                  );

                  element.results_contributing = queryTargetothercontributing;
                  if (Number(element.target_value)) {
                    itemIndicator.is_calculable = true;
                    let auxTotal = 0;
                    if (queryTargetothercontributing.length) {
                      queryTargetothercontributing.forEach((elementC) => {
                        auxTotal =
                          auxTotal + Number(elementC.contributing_indicator);
                      });
                    }

                    itemIndicator.total = auxTotal;
                  } else {
                    itemIndicator.is_calculable = false;
                  }
                });
              }
            });
          } else {
            IndicatorTargetData = await this.query(queryDataIndicators, [
              toc_result_id,
              resultId,
            ]);

            for (const itemIndicator of IndicatorTargetData) {
              itemIndicator.result = resultInfo[0];
              //Section get to location
              if (itemIndicator.location == 'country') {
                const regions = `select * 
            from clarisa_countries cc WHERE 
              cc.id  in (select trir.clarisa_countries_id  from Integration_information.toc_result_indicator_country trir where trir.toc_result_id =?)`;
                const region = await this.query(regions, [
                  itemIndicator.toc_results_indicator_id,
                ]);
                let full_region = null;
                region.map((item) => (full_region += `${item.name}`));

                itemIndicator.location = `Country/ies`;
                if (full_region != null) {
                  itemIndicator.full_geo = full_region;
                } else {
                  itemIndicator.is_calculable = false;
                }
              } else {
                if (itemIndicator.location == 'regional') {
                  const regions = `select * 
                                from clarisa_regions cr WHERE 
                                      cr.um49Code in (select trir.clarisa_regions_id  from Integration_information.toc_result_indicator_region trir where trir.toc_result_id = ?)`;
                  const region = await this.query(regions, [
                    itemIndicator.toc_results_indicator_id,
                  ]);
                  let full_region = null;
                  region.map((item) => (full_region += `${item.name}`));

                  itemIndicator.location = `Regional`;
                  if (full_region != null) {
                    itemIndicator.full_geo = '' + full_region;
                  } else {
                    itemIndicator.full_geo = ' No region(s) provided';
                  }
                }
                if (itemIndicator.location == 'global') {
                  itemIndicator.location = `Global`;
                  itemIndicator.full_geo = '';
                }

                //Finish Section get to location

                //Section to get the type

                if (
                  itemIndicator.type_value ==
                  'Change in the capacity of key (a) Individuals, (b) Organizations (government, civil society and private sector), and (c) Networks (e.g. multi-stakeholder platforms).'
                ) {
                  itemIndicator.type = 'Capacity change';
                  itemIndicator.number_result_type = 3;
                } else if (
                  itemIndicator.type_value == 'Number of innovations'
                ) {
                  itemIndicator.type = 'Innovation Development';
                  itemIndicator.number_result_type = 7;
                } else if (
                  itemIndicator.type_value ==
                  'Number of people trained, long-term (including Masters and PhDs) and short-term, disaggregated by gender'
                ) {
                  itemIndicator.type = 'Capacity Sharing for Development';
                  itemIndicator.number_result_type = 5;
                } else if (
                  itemIndicator.type_value ==
                  'Number of peer reviewed journal papers'
                ) {
                  itemIndicator.type = 'Knowledge Product';
                  itemIndicator.number_result_type = 6;
                } else if (
                  itemIndicator.type_value ==
                  'Number of other information products/data assets (including: reports, briefs, extension, training and e-learning content and other materials, books and book chapters, data and databases, data collection and analysis tools (e.g. models and survey tools), video, audio and images, graphics, maps, and other GIS outputs, computer software, models and code, digital and mobile applications, and web-based services (e.g. websites, data portals, online platforms)'
                ) {
                  itemIndicator.type = 'Knowledge Product';
                  itemIndicator.number_result_type = 6;
                } else if (
                  itemIndicator.type_value ==
                  'Number of policies/ strategies/ laws/ regulations/ budgets/ investments/ curricula modified in design or implementation, informed by CGIAR research.'
                ) {
                  itemIndicator.type = 'Policy change';
                  itemIndicator.number_result_type = 1;
                } else if (
                  itemIndicator.type_value ==
                  'Number of beneficiaries using the CGIAR innovation, disaggregated by gender.'
                ) {
                  itemIndicator.type = 'Innovation use';
                  itemIndicator.number_result_type = 2;
                } else if (
                  itemIndicator.type_value ==
                  'Other quantitative measure of CGIAR innovation use (e.g. area)'
                ) {
                  itemIndicator.type = 'Innovation use';
                  itemIndicator.number_result_type = 2;
                } else if (itemIndicator.type_value == 'Altmetric score') {
                  itemIndicator.type = 'Other outcome';
                  itemIndicator.number_result_type = 4;
                } else {
                  itemIndicator.type = 'N/A';
                  itemIndicator.number_result_type = 0;
                }
                //Finish Section to get the type
                //Section to get the targets
                const queryTargetInfo = `
                  SELECT
                    trit.target_value,
                    trit.target_date,
                    trit.number_target
                  FROM
                    Integration_information.toc_result_indicator_target trit
                  WHERE
                    trit.toc_result_indicator_id = ?
                    AND YEAR(DATE(trit.target_date)) = (
                        SELECT
                          v1.phase_year
                        FROM
                          prdb.version v1
                        WHERE
                          v1.phase_name LIKE '%Reporting%'
                          AND v1.is_active = 1
                          AND v1.status = 1
                    );
                `;
                const queryTargetInfoData = await this.query(queryTargetInfo, [
                  itemIndicator.toc_results_indicator_id,
                ]);
                itemIndicator.targets = queryTargetInfoData;

                itemIndicator.targets.forEach(async (element) => {
                  element.contributing = '';
                  element.indicator_question = null;
                  const queryTargetContributing = `
                    select
                      r.description,
                      r.title,
                      r.result_code,
                      v.phase_name,
                      v.id AS version_id,
                      rt.name AS result_type_name,
                      rit.contributing_indicator,
                      rit.target_progress_narrative
                    from
                      results_toc_result rtr
                      join results_toc_result_indicators rtri on rtri.results_toc_results_id = rtr.result_toc_result_id
                      and rtri.is_active = 1
                      join result_indicators_targets rit on rit.result_toc_result_indicator_id = rtri.result_toc_result_indicator_id
                      and rit.is_active = 1
                      join result r on r.id = rtr.results_id
                      join version v on v.id = r.version_id
                      join result_type rt ON rt.id = r.result_type_id
                    where
                      rtri.toc_results_indicator_id = ?
                      and rit.number_target = ?
                      and rtr.is_active = 1
                      and r.is_active = 1;
                  `;

                  const queryTargetothercontributing = await this.query(
                    queryTargetContributing,
                    [
                      itemIndicator.toc_results_indicator_id,
                      element.number_target,
                    ],
                  );

                  element.results_contributing = queryTargetothercontributing;
                  if (Number(element.target_value)) {
                    itemIndicator.is_calculable = true;
                    let auxTotal = 0;
                    if (queryTargetothercontributing.length) {
                      queryTargetothercontributing.forEach((elementC) => {
                        auxTotal =
                          auxTotal + Number(elementC.contributing_indicator);
                      });
                    }

                    itemIndicator.total = auxTotal;
                  } else {
                    itemIndicator.is_calculable = false;
                  }
                });
              }
            }
          }
        }
      } else {
        IndicatorTargetData = await this.query(queryDataIndicators, [
          toc_result_id,
          resultId,
        ]);

        for (const itemIndicator of IndicatorTargetData) {
          itemIndicator.result = resultInfo[0];
          //Section get to location
          if (itemIndicator.location == 'country') {
            const regions = `select * 
            from clarisa_countries cc WHERE 
              cc.id  in (select trir.clarisa_countries_id  from Integration_information.toc_result_indicator_country trir where trir.toc_result_id =?)`;
            const region = await this.query(regions, [
              itemIndicator.toc_results_indicator_id,
            ]);
            let full_region = null;
            region.map((item) => (full_region += `${item.name}`));

            itemIndicator.location = `Country/ies`;
            if (full_region != null) {
              itemIndicator.full_geo = full_region;
            } else {
              itemIndicator.full_geo = 'No country/ies provided';
            }
          }
          if (itemIndicator.location == 'regional') {
            const regions = `select * 
                                from clarisa_regions cr WHERE 
                                      cr.um49Code in (select trir.clarisa_regions_id  from Integration_information.toc_result_indicator_region trir where trir.toc_result_id = ?)`;
            const region = await this.query(regions, [
              itemIndicator.toc_results_indicator_id,
            ]);
            let full_region = null;
            region.map((item) => (full_region += `${item.name}`));

            itemIndicator.location = `Regional`;
            if (full_region != null) {
              itemIndicator.full_geo = '' + full_region;
            } else {
              itemIndicator.full_geo = ' No region(s) provided';
            }
          }
          if (itemIndicator.location == 'global') {
            itemIndicator.location = `Global`;
            itemIndicator.full_geo = '';
          }

          //Finish Section get to location

          //Section to get the type

          if (
            itemIndicator.type_value ==
            'Change in the capacity of key (a) Individuals, (b) Organizations (government, civil society and private sector), and (c) Networks (e.g. multi-stakeholder platforms).'
          ) {
            itemIndicator.type = 'Capacity change';
            itemIndicator.number_result_type = 3;
          } else if (itemIndicator.type_value == 'Number of innovations') {
            itemIndicator.type = 'Innovation Development';
            itemIndicator.number_result_type = 7;
          } else if (
            itemIndicator.type_value ==
            'Number of people trained, long-term (including Masters and PhDs) and short-term, disaggregated by gender'
          ) {
            itemIndicator.type = 'Capacity Sharing for Development';
            itemIndicator.number_result_type = 5;
          } else if (
            itemIndicator.type_value == 'Number of peer reviewed journal papers'
          ) {
            itemIndicator.type = 'Knowledge Product';
            itemIndicator.number_result_type = 6;
          } else if (
            itemIndicator.type_value ==
            'Number of other information products/data assets (including: reports, briefs, extension, training and e-learning content and other materials, books and book chapters, data and databases, data collection and analysis tools (e.g. models and survey tools), video, audio and images, graphics, maps, and other GIS outputs, computer software, models and code, digital and mobile applications, and web-based services (e.g. websites, data portals, online platforms)'
          ) {
            itemIndicator.type = 'Knowledge Product';
            itemIndicator.number_result_type = 6;
          } else if (
            itemIndicator.type_value ==
            'Number of policies/ strategies/ laws/ regulations/ budgets/ investments/ curricula modified in design or implementation, informed by CGIAR research.'
          ) {
            itemIndicator.type = 'Policy change';
            itemIndicator.number_result_type = 1;
          } else if (
            itemIndicator.type_value ==
            'Number of beneficiaries using the CGIAR innovation, disaggregated by gender.'
          ) {
            itemIndicator.type = 'Innovation use';
            itemIndicator.number_result_type = 2;
          } else if (
            itemIndicator.type_value ==
            'Other quantitative measure of CGIAR innovation use (e.g. area)'
          ) {
            itemIndicator.type = 'Innovation use';
            itemIndicator.number_result_type = 2;
          } else if (itemIndicator.type_value == 'Altmetric score') {
            itemIndicator.type = 'Other outcome';
            itemIndicator.number_result_type = 4;
          } else {
            itemIndicator.type = 'N/A';
            itemIndicator.number_result_type = 0;
          }
          //Finish Section to get the type
          //Section to get the targets
          const queryTargetInfo = `
          SELECT
            trit.target_value,
            trit.target_date,
            trit.number_target
          FROM
            Integration_information.toc_result_indicator_target trit
          WHERE
            trit.toc_result_indicator_id = ?
            AND YEAR(DATE(trit.target_date)) = (
                SELECT
                  v1.phase_year
                FROM
                  prdb.version v1
                WHERE
                  v1.phase_name LIKE '%Reporting%'
                  AND v1.is_active = 1
                  AND v1.status = 1
            );
          `;
          const queryTargetInfoData = await this.query(queryTargetInfo, [
            itemIndicator.toc_results_indicator_id,
          ]);
          itemIndicator.targets = queryTargetInfoData;

          itemIndicator.targets.forEach(async (element) => {
            element.contributing = '';
            element.indicator_question = null;
            const queryTargetContributing = `
            SELECT
              r.description,
              r.title,
              r.result_code,
              v.phase_name,
              v.id AS version_id,
              rt.name AS result_type_name,
              rit.contributing_indicator,
              rit.target_progress_narrative
            FROM
              results_toc_result rtr
              JOIN results_toc_result_indicators rtri ON rtri.results_toc_results_id = rtr.result_toc_result_id
              AND rtri.is_active = 1
              JOIN result_indicators_targets rit ON rit.result_toc_result_indicator_id = rtri.result_toc_result_indicator_id
              AND rit.is_active = 1
              JOIN result r ON r.id = rtr.results_id
              join version v on v.id = r.version_id
              join result_type rt ON rt.id = r.result_type_id
            WHERE
              rtri.toc_results_indicator_id = ?
              AND rit.number_target = ?
              AND rtr.is_active = 1
              and r.is_active = 1
              AND rit.indicator_question = 1;
                `;

            const queryTargetothercontributing = await this.query(
              queryTargetContributing,
              [itemIndicator.toc_results_indicator_id, element.number_target],
            );

            element.results_contributing = queryTargetothercontributing;
            if (Number(element.target_value)) {
              itemIndicator.is_calculable = true;
              let auxTotal = 0;
              if (queryTargetothercontributing.length) {
                queryTargetothercontributing.forEach((elementC) => {
                  auxTotal = auxTotal + Number(elementC.contributing_indicator);
                });
              }

              itemIndicator.total = auxTotal;
            } else {
              itemIndicator.is_calculable = false;
            }
          });
        }
      }
      return IndicatorTargetData;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: `updateResultByInitiative ${error}`,
        debug: true,
      });
    }
  }

  async saveInditicatorsContributing(
    targetsIndicator: any[],
    id_result_toc_result?: number,
  ) {
    try {
      if (id_result_toc_result) {
        await this._resultsTocResultIndicator.update(
          { results_toc_results_id: id_result_toc_result },
          { is_active: false },
        );
      }

      for (const itemIndicator of targetsIndicator) {
        const targetIndicators = await this._resultsTocResultIndicator.findOne({
          where: {
            results_toc_results_id: id_result_toc_result,
            toc_results_indicator_id: itemIndicator.toc_results_indicator_id,
          },
        });

        if (targetIndicators) {
          targetIndicators.is_active = true;
          await this._resultsTocResultIndicator.update(
            {
              results_toc_results_id: id_result_toc_result,
              toc_results_indicator_id: itemIndicator.toc_results_indicator_id,
            },
            targetIndicators,
          );
          await this._resultTocIndicatorTargetRepository.update(
            {
              result_toc_result_indicator_id:
                targetIndicators.result_toc_result_indicator_id,
            },
            { is_active: false },
          );

          if (itemIndicator.targets) {
            for (const target of itemIndicator.targets) {
              const targetInfo =
                await this._resultTocIndicatorTargetRepository.findOne({
                  where: {
                    result_toc_result_indicator_id:
                      targetIndicators.result_toc_result_indicator_id,
                    number_target: target.number_target,
                  },
                });
              if (targetInfo != null) {
                targetInfo.is_active = true;
                targetInfo.contributing_indicator =
                  target.indicator_question == 1
                    ? parseFloat(target.contributing)
                    : null;
                targetInfo.indicator_question = target.indicator_question;
                targetInfo.target_progress_narrative =
                  target.indicator_question == 1
                    ? target.target_progress_narrative
                    : null;
                await this._resultTocIndicatorTargetRepository.update(
                  {
                    result_toc_result_indicator_id:
                      targetIndicators.result_toc_result_indicator_id,
                    number_target: target.number_target,
                  },
                  targetInfo,
                );
              } else {
                await this._resultTocIndicatorTargetRepository.save({
                  result_toc_result_indicator_id:
                    targetIndicators.result_toc_result_indicator_id,
                  contributing_indicator:
                    target.indicator_question == 1
                      ? parseFloat(target.contributing)
                      : null,
                  indicator_question: target.indicator_question,
                  number_target: target.number_target,
                  is_active: true,
                  target_progress_narrative:
                    target.indicator_question == 1
                      ? target.target_progress_narrative
                      : null,
                });
              }
            }
          }
        } else {
          const resultTocResultIndicator =
            await this._resultsTocResultIndicator.save({
              results_toc_results_id: id_result_toc_result,
              toc_results_indicator_id: itemIndicator.toc_results_indicator_id,
              is_active: true,
            });
          if (itemIndicator.targets) {
            for (const target of itemIndicator.targets) {
              await this._resultTocIndicatorTargetRepository.save({
                result_toc_result_indicator_id:
                  resultTocResultIndicator.result_toc_result_indicator_id,
                contributing_indicator:
                  target.indicator_question == 1
                    ? parseFloat(target.contributing)
                    : null,
                indicator_question: target.indicator_question,
                is_active: true,
                number_target: target.number_target,
                target_progress_narrative:
                  target.indicator_question == 1
                    ? target.target_progress_narrative
                    : null,
              });
            }
          }
        }
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: `Error saving Indicators Primary Contributors ${error}`,
        debug: true,
      });
    }
  }

  async getImpactAreaTargetsToc(
    resultId: number,
    toc_result_id: number,
    init: number,
  ) {
    try {
      const queryTocIndicators = `
      select
          *
      from
          clarisa_global_targets cgt
          join clarisa_impact_areas cia on cgt.impactAreaId = cia.id
      where
          targetId in (
              SELECT
                  tiargt.global_targets_id
              from
                  Integration_information.toc_results tr
                  join Integration_information.toc_results_impact_area_results triar on triar.toc_results_id = tr.id
                  join Integration_information.toc_impact_area_results tiar on tiar.id = triar.toc_impact_area_results_id
                  join Integration_information.toc_impact_area_results_global_targets tiargt on tiargt.toc_impact_area_results_id = tiar.id
              where
                  tr.id = ?
                  and tr.phase = (
                      select
                          v.toc_pahse_id
                      from
                          result r
                          join version v on r.version_id = v.id
                      where
                          r.id = ?
                  )
          );`;

      const impactAreaTarget = await this.query(`
      select
          *
      from
          results_toc_result
      where
          results_id = ${resultId}
          and is_active = true
          and initiative_id = ${init}
          and toc_result_id = ${toc_result_id};
      `);
      let returnInfo = [];
      if (
        impactAreaTarget != null &&
        impactAreaTarget[0]?.result_toc_result_id != null
      ) {
        await this._resultsTocImpactAreaTargetRepository.find({
          where: {
            result_toc_result_id: impactAreaTarget[0]?.result_toc_result_id,
            is_active: true,
          },
        });
        const queryImpactAreaTargets = `
    select * 
	  from clarisa_global_targets cgt 
		join clarisa_impact_areas cia on cgt.impactAreaId = cia.id 
	  where targetId in (select impact_area_indicator_id from result_toc_impact_area_target where result_toc_result_id = ?)
    `;
        returnInfo = await this.query(queryImpactAreaTargets, [
          impactAreaTarget[0]?.result_toc_result_id,
        ]);
      }

      if (returnInfo.length != 0) {
        const queryImpactAreaTargets = `
        select * 
        from clarisa_global_targets cgt 
        join clarisa_impact_areas cia on cgt.impactAreaId = cia.id 
        where targetId in (select impact_area_indicator_id from result_toc_impact_area_target where result_toc_result_id = ? and is_active >0 )
        `;
        const info = await this.query(queryImpactAreaTargets, [
          impactAreaTarget[0]?.result_toc_result_id,
        ]);
        return info;
      } else {
        const innovatonUseInterface = await this.query(queryTocIndicators, [
          toc_result_id,
          resultId,
        ]);
        return innovatonUseInterface;
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: `updateResultByInitiative ${error}`,
        debug: true,
      });
    }
  }

  async getSdgTargetsToc(resultId, toc_result_id, init) {
    try {
      const queryTocIndicators = `
      select * 
    from clarisa_sdgs_targets  cgt 
      join clarisa_sdgs cs on cs.usnd_code = cgt.usnd_code 
    where cgt.id  in (
          SELECT tsrst.sdg_target_id  from  Integration_information.toc_results tr 
          join Integration_information.toc_results_sdg_results trsr  on trsr.toc_results_id  = tr.id
          join Integration_information.toc_sdg_results tsr  on tsr.id = trsr.toc_sdg_results_id 
          join Integration_information.toc_sdg_results_sdg_targets tsrst  on tsrst.toc_sdg_results_id  = tsr.id 
          where tr.id  = ? and tr.phase = (select v.toc_pahse_id  
                                      from result r 	
                                      join version v on r.version_id = v.id  
                                        where r.id  = ?)
    )
 `;

      const impactAreaTarget = await this.query(
        `select * from results_toc_result where results_id = ${resultId} and is_active = true and initiative_id = ${init} and toc_result_id = ${toc_result_id};`,
      );
      let returnInfo = [];
      if (
        impactAreaTarget != null &&
        impactAreaTarget[0]?.result_toc_result_id != null
      ) {
        await this._resultsTocSdgTargetRepository.find({
          where: {
            result_toc_result_id: impactAreaTarget[0]?.result_toc_result_id,
          },
        });
        const queryImpactAreaTargets = `
   select * 
    from clarisa_sdgs_targets  cgt 
      join clarisa_sdgs cs on cs.usnd_code = cgt.usnd_code 
    where cgt.id  in (select clarisa_sdg_target_id from result_toc_sdg_targets where result_toc_result_id = ? )
   `;
        returnInfo = await this.query(queryImpactAreaTargets, [
          impactAreaTarget[0]?.result_toc_result_id,
        ]);
      }

      if (returnInfo.length != 0) {
        const queryImpactAreaTargetsActive = `
   select * 
    from clarisa_sdgs_targets  cgt 
      join clarisa_sdgs cs on cs.usnd_code = cgt.usnd_code 
    where cgt.id  in (select clarisa_sdg_target_id from result_toc_sdg_targets where result_toc_result_id = ? and is_active > 0)
   `;
        const infoSdg = await this.query(queryImpactAreaTargetsActive, [
          impactAreaTarget[0]?.result_toc_result_id,
        ]);

        return infoSdg;
      } else {
        const innovatonUseInterface = await this.query(queryTocIndicators, [
          toc_result_id,
          resultId,
        ]);
        return innovatonUseInterface;
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: `updateResultByInitiative ${error}`,
        debug: true,
      });
    }
  }

  async getActionAreaOutcome(resultId, toc_result_id, init) {
    try {
      const queryTocIndicators = `
      select caa.id as 'actionAreaId', caao.id as 'action_area_outcome_id', caao.outcome_smo_code as 'outcomeSMOcode', caao.outcome_statement  as 'outcomeStatement'
    from Integration_information.clarisa_action_areas_outcomes_indicators caao  
      join clarisa_action_area caa on caa.id = caao.action_area_id  
    where caao.id  in (
          SELECT taaroi.action_areas_outcomes_indicators_id  from  Integration_information.toc_results tr 
          join Integration_information.toc_results_action_area_results traar   on traar.toc_results_id  = tr.id
          join Integration_information.toc_action_area_results taar   on taar.id = traar.toc_action_area_results_id  
          join Integration_information.toc_action_area_results_outcomes_indicators taaroi    on taaroi.toc_action_area_results_id  = taar.id 
          where tr.id  = ? and tr.phase = (select v.toc_pahse_id  
                                      from result r 	
                                      join version v on r.version_id = v.id  
                                        where r.id  = ?)
    )
 `;
      const actionArea = await this.query(
        `select * from results_toc_result where results_id = ${resultId} and is_active = true and initiative_id = ${init} and toc_result_id = ${toc_result_id};`,
      );
      let returnInfo = [];
      if (actionArea != null && actionArea[0]?.result_toc_result_id != null) {
        const queryActionArea = `
  select * 
    from Integration_information.clarisa_action_areas_outcomes_indicators caao  
      join clarisa_action_area caa on caa.id = caao.action_area_id  
    where caao.id in (select action_area_outcome from result_toc_action_area where result_toc_result_id = ?)
  `;

        returnInfo = await this.query(queryActionArea, [
          actionArea[0]?.result_toc_result_id,
        ]);
      }
      if (returnInfo.length != 0) {
        const queryImpactAreaTargets = `
  select caa.id as 'actionAreaId', caao.id as 'action_area_outcome_id', caao.outcome_smo_code as 'outcomeSMOcode', caao.outcome_statement  as 'outcomeStatement' 
    from Integration_information.clarisa_action_areas_outcomes_indicators caao  
      join clarisa_action_area caa on caa.id = caao.action_area_id  
    where caao.id in (select action_area_outcome from result_toc_action_area where result_toc_result_id = ? and is_active > 0)
  `;
        const info = await this.query(queryImpactAreaTargets, [
          actionArea[0]?.result_toc_result_id,
        ]);
        return info;
      } else {
        const innovatonUseInterface = await this.query(queryTocIndicators, [
          toc_result_id,
          resultId,
        ]);
        return innovatonUseInterface;
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: `updateResultByInitiative ${error}`,
        debug: true,
      });
    }
  }

  async saveImpact(
    id_result_toc_result: number,
    impactAreaTargets: any[],
    result_id: number,
    init: number,
  ) {
    try {
      if (!id_result_toc_result) return;
      await this._resultsTocImpactAreaTargetRepository.update(
        { result_toc_result_id: id_result_toc_result },
        { is_active: false },
      );
      if (impactAreaTargets) {
        for (const impact of impactAreaTargets) {
          const targetIndicators =
            await this._resultsTocImpactAreaTargetRepository.findOne({
              where: {
                result_toc_result_id: id_result_toc_result,
                impact_area_indicator_id: impact.targetId,
              },
            });

          if (targetIndicators != null) {
            targetIndicators.is_active = true;
            await this._resultsTocImpactAreaTargetRepository.update(
              {
                result_toc_impact_area_id:
                  targetIndicators.result_toc_impact_area_id,
              },
              targetIndicators,
            );
          } else {
            await this._resultsTocImpactAreaTargetRepository.save({
              result_toc_result_id: id_result_toc_result,
              impact_area_indicator_id: impact.targetId,
              is_active: true,
            });
          }
        }
      } else {
        const queryImpactAreaTargets = `
      select * 
	  from clarisa_global_targets cgt 
		join clarisa_impact_areas cia on cgt.impactAreaId = cia.id 
	  where targetId in (select impact_area_indicator_id from result_toc_impact_area_target where result_toc_result_id = ? )
      `;
        const returnInfo = await this.query(queryImpactAreaTargets, [
          id_result_toc_result,
        ]);

        if (returnInfo.length == 0) {
          const queryTocIndicators = `select * from results_toc_result where results_id = ${result_id} and is_active = true and initiative_id = ${init};`;
          const innovatonUseInterface = await this.query(queryTocIndicators);

          if (
            innovatonUseInterface != null &&
            innovatonUseInterface.length != 0
          ) {
            const queryImpactAreaTargetsActive = `
         select * 
         from clarisa_global_targets cgt 
           join clarisa_impact_areas cia on cgt.impactAreaId = cia.id 
         where targetId in (
               SELECT tiargt.global_targets_id  from  Integration_information.toc_results tr 
               join Integration_information.toc_results_impact_area_results triar on triar.toc_results_id  = tr.id
               join Integration_information.toc_impact_area_results tiar on tiar.id = triar.toc_impact_area_results_id 
               join Integration_information.toc_impact_area_results_global_targets tiargt on tiargt.toc_impact_area_results_id = tiar.id 
               where tr.id  = ? and tr.phase = (select v.toc_pahse_id  
                                           from result r 	
                                           join version v on r.version_id = v.id  
                                             where r.id  = ?)
         )
         `;

            const sdgToc = await this.query(queryImpactAreaTargetsActive, [
              innovatonUseInterface[0]?.toc_result_id,
              result_id,
            ]);

            if (sdgToc != null && sdgToc.length != 0) {
              for (const info of sdgToc) {
                await this._resultsTocImpactAreaTargetRepository.save({
                  result_toc_result_id: id_result_toc_result,
                  impact_area_indicator_id: info.targetId,
                  is_active: false,
                });
              }
            }
          }
        }
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: `Error saving Impact Area ${error}`,
        debug: true,
      });
    }
  }

  async saveSdg(
    id_result_toc_result: number,
    sdgTargets: any[],
    result_id: number,
  ) {
    try {
      if (!id_result_toc_result) return;
      await this._resultsTocSdgTargetRepository.update(
        { result_toc_result_id: id_result_toc_result },
        { is_active: false },
      );
      if (sdgTargets) {
        for (const impact of sdgTargets) {
          const targetIndicators =
            await this._resultsTocSdgTargetRepository.findOne({
              where: {
                result_toc_result_id: id_result_toc_result,
                clarisa_sdg_target_id: impact.id,
                clarisa_sdg_usnd_code: impact.usnd_code,
              },
            });

          if (targetIndicators != null) {
            targetIndicators.is_active = true;
            await this._resultsTocSdgTargetRepository.update(
              {
                result_toc_sdg_target_id:
                  targetIndicators.result_toc_sdg_target_id,
              },
              targetIndicators,
            );
          } else {
            await this._resultsTocSdgTargetRepository.save({
              result_toc_result_id: id_result_toc_result,
              clarisa_sdg_target_id: impact.id,
              clarisa_sdg_usnd_code: impact.usnd_code,
            });
          }
        }
      } else {
        const queryImpactAreaTargets = `
   select * 
    from clarisa_sdgs_targets  cgt 
      join clarisa_sdgs cs on cs.usnd_code = cgt.usnd_code 
    where cgt.id  in (select clarisa_sdg_target_id from result_toc_sdg_targets where result_toc_result_id = ? )
   `;
        const returnInfo = await this.query(queryImpactAreaTargets, [
          id_result_toc_result,
        ]);

        if (returnInfo.length == 0) {
          const queryTocIndicators = `select * from results_toc_result where result_toc_result_id = ${id_result_toc_result};`;
          const innovatonUseInterface = await this.query(queryTocIndicators);

          if (
            innovatonUseInterface != null &&
            innovatonUseInterface.length != 0
          ) {
            const queryImpactAreaTargetsActive = `
select * 
    from clarisa_sdgs_targets  cgt 
      join clarisa_sdgs cs on cs.usnd_code = cgt.usnd_code 
    where cgt.id  in (
          SELECT tsrst.sdg_target_id  from  Integration_information.toc_results tr 
          join Integration_information.toc_results_sdg_results trsr  on trsr.toc_results_id  = tr.id
          join Integration_information.toc_sdg_results tsr  on tsr.id = trsr.toc_sdg_results_id 
          join Integration_information.toc_sdg_results_sdg_targets tsrst  on tsrst.toc_sdg_results_id  = tsr.id 
          where tr.id  = ? and tr.phase = (select v.toc_pahse_id  
                                      from result r 	
                                      join version v on r.version_id = v.id  
                                        where r.id  = ?)
    )
      `;

            const sdgToc = await this.query(queryImpactAreaTargetsActive, [
              innovatonUseInterface[0]?.toc_result_id,
              result_id,
            ]);

            if (sdgToc != null && sdgToc.length != 0) {
              for (const info of sdgToc) {
                await this._resultsTocSdgTargetRepository.save({
                  result_toc_result_id: id_result_toc_result,
                  clarisa_sdg_target_id: info.id,
                  clarisa_sdg_usnd_code: info.usnd_code,
                  is_active: false,
                });
              }
            }
          }
        }
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: `Error saving SDG Target ToC ${error}`,
        debug: true,
      });
    }
  }

  async saveActionAreaToc(
    id_result_toc_result: number,
    actionarea: any[],
    result_id: number,
  ) {
    try {
      if (!id_result_toc_result) return;
      await this._resultActionAreaRepository.update(
        { result_toc_result_id: id_result_toc_result },
        { is_active: false },
      );

      if (actionarea) {
        for (const impact of actionarea) {
          const targetIndicators =
            await this._resultActionAreaRepository.findOne({
              where: {
                result_toc_result_id: id_result_toc_result,
                action_area_outcome: impact.action_area_outcome_id,
              },
            });

          if (targetIndicators != null) {
            targetIndicators.is_active = true;
            await this._resultActionAreaRepository.update(
              {
                result_toc_action_area: targetIndicators.result_toc_action_area,
              },
              targetIndicators,
            );
          } else {
            await this._resultActionAreaRepository.save({
              result_toc_result_id: id_result_toc_result,
              action_area_outcome: impact.action_area_outcome_id,
            });
          }
        }
      } else {
        const queryActionArea = `
  select * 
    from Integration_information.clarisa_action_areas_outcomes_indicators caao  
      join clarisa_action_area caa on caa.id = caao.action_area_id  
    where caao.id in (select action_area_outcome from result_toc_action_area where result_toc_result_id = ?)
  `;
        const returnInfo = await this.query(queryActionArea, [
          id_result_toc_result,
        ]);

        if (returnInfo.length == 0) {
          const queryTocIndicators = `select * from results_toc_result where result_toc_result_id = ${id_result_toc_result};`;
          const innovatonUseInterface = await this.query(queryTocIndicators);

          if (
            innovatonUseInterface != null &&
            innovatonUseInterface.length != 0
          ) {
            const queryTocIndicators = `
      select caa.id as 'actionAreaId', caao.id as 'action_area_outcome_id', caao.outcome_smo_code as 'outcomeSMOcode', caao.outcome_statement  as 'outcomeStatement'
    from Integration_information.clarisa_action_areas_outcomes_indicators caao  
      join clarisa_action_area caa on caa.id = caao.action_area_id  
    where caao.id  in (
          SELECT taaroi.action_areas_outcomes_indicators_id  from  Integration_information.toc_results tr 
          join Integration_information.toc_results_action_area_results traar   on traar.toc_results_id  = tr.id
          join Integration_information.toc_action_area_results taar   on taar.id = traar.toc_action_area_results_id  
          join Integration_information.toc_action_area_results_outcomes_indicators taaroi    on taaroi.toc_action_area_results_id  = taar.id 
          where tr.id  = ? and tr.phase = (select v.toc_pahse_id  
                                      from result r 	
                                      join version v on r.version_id = v.id  
                                        where r.id  = ?)
            )
        `;

            const sdgToc = await this.query(queryTocIndicators, [
              innovatonUseInterface[0]?.toc_result_id,
              result_id,
            ]);

            if (sdgToc != null && sdgToc.length != 0) {
              for (const info of sdgToc) {
                await this._resultActionAreaRepository.save({
                  result_toc_result_id: id_result_toc_result,
                  action_area_outcome: info.action_area_outcome_id,
                  is_active: false,
                });
              }
            }
          }
        }
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: `Error saving Action Area ToC ${error}`,
        debug: true,
      });
    }
  }

  async saveIndicatorsPrimarySubmitter(
    ResultTocResultIndicators: CreateResultsTocResultDto,
    result_id?: number,
  ) {
    if (!ResultTocResultIndicators) return;
    const { result_toc_result } = ResultTocResultIndicators;
    if (!result_toc_result?.result_toc_results.map((e) => e.indicators)) return;
    try {
      for (const toc of result_toc_result.result_toc_results) {
        if (toc) {
          const rtrExist = await this.findOne({
            where: {
              result_id: toc?.results_id || result_id,
              initiative_id: toc?.initiative_id,
              toc_result_id: toc?.toc_result_id,
              is_active: true,
            },
          });
          if (rtrExist) {
            await this.update(
              { result_toc_result_id: rtrExist[0]?.result_toc_result_id },
              {
                is_sdg_action_impact: toc?.is_sdg_action_impact,
              },
            );
            // * Save Impact Area
            await this.saveImpact(
              rtrExist?.result_toc_result_id,
              toc?.impactAreasTargets,
              toc?.results_id || result_id,
              toc?.initiative_id,
            );
            // * Save SDG
            await this.saveSdg(
              rtrExist?.result_toc_result_id,
              toc?.sdgTargest,
              toc?.results_id || result_id,
            );
            // * Save Action Area
            await this.saveActionAreaToc(
              rtrExist?.result_toc_result_id,
              toc?.actionAreaOutcome,
              toc?.result_toc_result_id,
            );

            // * Save Indicators
            if (toc?.indicators) {
              await this.saveInditicatorsContributing(
                toc?.indicators,
                rtrExist?.result_toc_result_id,
              );
            }
          } else {
            return this._handlersError.returnErrorRepository({
              className: ResultsTocResultRepository.name,
              error: `The result toc result id ${toc?.result_toc_result_id} does not exist`,
              debug: true,
            });
          }
        }
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: `Error saving Indicators Primary Submitter ${error}`,
        debug: true,
      });
    }
  }

  async saveIndicatorsContributors(
    ResultTocResultIndicators: CreateResultsTocResultDto,
    result_id?: number,
  ) {
    const { contributors_result_toc_result } = ResultTocResultIndicators;
    if (
      !contributors_result_toc_result.map((i) =>
        i.result_toc_results.map((e) => e.indicators),
      )
    )
      return;

    try {
      for (const contributor of contributors_result_toc_result) {
        for (const toc of contributor.result_toc_results) {
          for (const indicators of toc.indicators) {
            const rtrExist = await this.findOne({
              where: {
                result_id: toc?.results_id || result_id,
                initiative_id: toc?.initiative_id,
                toc_result_id: toc?.toc_result_id,
                is_active: true,
              },
            });

            if (rtrExist) {
              await this.update(
                { result_toc_result_id: rtrExist?.result_toc_result_id },
                {
                  is_sdg_action_impact: toc?.is_sdg_action_impact,
                },
              );
              await this.saveImpact(
                rtrExist?.result_toc_result_id,
                toc?.impactAreasTargets,
                toc?.results_id,
                toc?.initiative_id,
              );
              await this.saveSdg(
                rtrExist?.result_toc_result_id,
                toc?.sdgTargest,
                toc?.results_id,
              );
              await this.saveActionAreaToc(
                rtrExist.result_toc_result_id,
                toc?.actionAreaOutcome,
                toc?.result_toc_result_id,
              );

              // * Save Indicators
              if (toc?.indicators) {
                await this.saveInditicatorsContributing(
                  toc?.indicators,
                  rtrExist?.result_toc_result_id,
                );
              }
            } else {
              return this._handlersError.returnErrorRepository({
                className: ResultsTocResultRepository.name,
                error: `The result indicators result id ${indicators?.result_toc_result_id} does not exist`,
                debug: true,
              });
            }
          }
        }
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: `Error saving Indicators Contributors ${error}`,
        debug: true,
      });
    }
  }

  async getSdgTargetsByResultId(resultId) {
    const querySDGTargetActive = `
      select * 
    from clarisa_sdgs_targets  cgt 
      join clarisa_sdgs cs on cs.usnd_code = cgt.usnd_code
      join result_sdg_targets rst on rst.clarisa_sdg_target_id = cgt.id
    where rst.result_id = ? and is_active = true;
    `;
    try {
      const resultTocResult: any[] = await this.query(querySDGTargetActive, [
        resultId,
      ]);
      return resultTocResult;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: `updateResultByInitiative ${error}`,
        debug: true,
      });
    }
  }

  async saveSdgTargets(resultId: number, sdgTargets: any[]) {
    try {
      this._resultsSdgTargetRepository.update(
        { result_id: resultId },
        { is_active: false },
      );

      if (sdgTargets.length > 0) {
        for (const sdg of sdgTargets) {
          const sdgTarget = await this._resultsSdgTargetRepository.findOne({
            where: {
              result_id: resultId,
              clarisa_sdg_target_id: sdg.id,
              clarisa_sdg_usnd_code: sdg.usnd_code,
            },
          });

          if (sdgTarget != null) {
            await this._resultsSdgTargetRepository.update(
              { result_sdg_target_id: sdgTarget.result_sdg_target_id },
              {
                is_active: true,
              },
            );
          } else {
            await this._resultsSdgTargetRepository.save({
              result_id: resultId,
              clarisa_sdg_target_id: sdg.id,
              clarisa_sdg_usnd_code: sdg.usnd_code,
              is_active: true,
            });
          }
        }
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: `Error saving SDG Target ${error}`,
        debug: true,
      });
    }
  }

  async getActionAreaByResultid(result_id, init) {
    try {
      const actionArea = await this.query(
        `select * from results_toc_result where results_id = ${result_id} and is_active = true and initiative_id = ${init};`,
      );

      if (actionArea != null && actionArea[0]?.result_toc_result_id != null) {
        const querySDGTargetActive = `
      select caa.id as 'actionAreaId', caao.id as 'action_area_outcome_id', caao.outcome_smo_code as 'outcomeSMOcode', caao.outcome_statement  as 'outcomeStatement' 
        from Integration_information.clarisa_action_areas_outcomes_indicators caao  
          join clarisa_action_area caa on caa.id = caao.action_area_id  
        where caao.id in (select action_area_outcome from result_toc_action_area where result_toc_result_id = ? and is_active > 0)
      `;
        const resultTocResult: any[] = await this.query(querySDGTargetActive, [
          actionArea[0]?.result_toc_result_id,
        ]);

        return resultTocResult;
      } else {
        return [];
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: `updateResultByInitiative ${error}`,
        debug: true,
      });
    }
  }

  async saveActionAreaOutcomeResult(
    resultId: any,
    actionArea: any[],
    init: any,
  ) {
    try {
      const actionAreas = await this.query(
        `select * from results_toc_result where results_id = ${resultId} and is_active = true and initiative_id = ${init};`,
      );
      if (actionAreas != null && actionAreas[0]?.result_toc_result_id != null) {
        await this._resultActionAreaRepository.update(
          { result_toc_result_id: actionAreas[0]?.result_toc_result_id },
          { is_active: false },
        );

        if (actionArea.length != 0) {
          for (const impact of actionArea) {
            const targetIndicators =
              await this._resultActionAreaRepository.findOne({
                where: {
                  result_toc_result_id: actionAreas[0]?.result_toc_result_id,
                  action_area_outcome: impact.action_area_outcome_id,
                },
              });

            if (targetIndicators != null) {
              targetIndicators.is_active = true;
              await this._resultActionAreaRepository.update(
                {
                  result_toc_action_area:
                    targetIndicators.result_toc_action_area,
                },
                targetIndicators,
              );
            } else {
              await this._resultActionAreaRepository.save({
                result_toc_result_id: actionAreas[0]?.result_toc_result_id,
                action_area_outcome: impact.action_area_outcome_id,
              });
            }
          }
        }
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: `Error saving Action Area Result ${error}`,
        debug: true,
      });
    }
  }
}
