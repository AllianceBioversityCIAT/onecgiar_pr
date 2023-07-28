import { Injectable, Logger } from '@nestjs/common';
import { env } from 'process';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsTocResult } from './entities/results-toc-result.entity';
import {
  ReplicableConfigInterface,
  ReplicableInterface,
} from '../../../shared/globalInterfaces/replicable.interface';
import { ResultsTocResultIndicatorsRepository } from './results-toc-results-indicators.repository';
import { isNumber } from 'class-validator';
import { ResultsTocImpactAreaTargetRepository } from './result-toc-impact-area-repository';
import { ResultsTocSdgTargetRepository } from './result-toc-sdg-target-repository';

@Injectable()
export class ResultsTocResultRepository
  extends Repository<ResultsTocResult>
  implements ReplicableInterface<ResultsTocResult>
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
  ) {
    super(ResultsTocResult, dataSource.createEntityManager());
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
          now() as created_date,
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
        const queryData: string = `
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
        now() as created_date,
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

    config.f?.completeFunction
      ? config.f.completeFunction({ ...final_data })
      : null;

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
      tr.toc_level_id
    FROM
      results_toc_result rtr
      left join clarisa_initiatives ci on ci.id = rtr.initiative_id 
      left JOIN toc_result tr on tr.toc_result_id = rtr.toc_result_id
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
        const upDateInactiveResult = await this.query(upDateInactive, [
          userId,
          resultId,
        ]);

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
      const queryTocIndicators = `
      SELECT tri.toc_result_indicator_id as toc_results_indicator_id,tri.indicator_description, 
		tri.target_date, tri.target_value, tri.unit_messurament, tr.phase,rtr.result_toc_result_id as results_toc_results_id
		from Integration_information.toc_results_indicators tri 
			join Integration_information.toc_results tr on tr.id = tri.toc_results_id 
			inner join results_toc_result rtr on rtr.results_id = ? 
		WHEre tr.id  = ? and tr.phase = (select v.toc_pahse_id  
	              										from result r 	
	              										join version v on r.version_id = v.id  
	              											where r.id  = ?) and rtr.initiative_id = ?`;

      const infoIndicatorSave = `
        select * from results_toc_result_indicators rtri 
          WHERE rtri.results_toc_results_id = ?`;

      let saveIndicators: any[] = [];
      let innovatonUseInterface = await this.query(queryTocIndicators, [
        resultId,
        toc_result_id,
        resultId,
        init,
      ]);
      console.log(innovatonUseInterface);
      if (innovatonUseInterface != null && innovatonUseInterface.length > 0) {
        if (innovatonUseInterface[0].results_toc_results_id != null) {
          saveIndicators = await this.query(infoIndicatorSave, [
            innovatonUseInterface[0].results_toc_results_id,
          ]);
        }
      }

      innovatonUseInterface.forEach(async (element) => {
        if (saveIndicators.length) {
          saveIndicators.forEach(async (elementSave) => {
            if (
              element.toc_results_indicator_id ==
              elementSave.toc_results_indicator_id
            ) {
              element.is_not_aplicable = elementSave.is_not_aplicable;
              element.indicator_contributing =
                elementSave.indicator_contributing;
              element.status = elementSave.status;
              element.is_not_aplicable = elementSave.is_not_aplicable;
            }
          });
        }
        if (Number(element?.target_value)) {
          element.is_calculable = true;
          element.indicator_new = 0;
        } else {
          element.is_calculable = false;
        }
      });

      return innovatonUseInterface;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: `updateResultByInitiative ${error}`,
        debug: true,
      });
    }
  }

  async saveInditicatorsContributing(
    id_result_toc_result: number,
    targetsIndicator: any[],
  ) {
    try {
      await this._resultsTocResultIndicator.update(
        { results_toc_results_id: id_result_toc_result },
        { is_active: false },
      );

      for (let element of targetsIndicator) {
        let targetIndicators = await this._resultsTocResultIndicator.findOne({
          where: {
            results_toc_results_id: id_result_toc_result,
            toc_results_indicator_id: element.toc_results_indicator_id,
          },
        });

        if (element.is_not_aplicable == null) {
          element.is_not_aplicable = false;
        }

        if (targetIndicators != null) {
          if (element.is_calculable) {
            const missing =
              Number(element.target_value) -
              Number(targetIndicators.indicator_contributing);
            if (missing != 0 && element.indicator_new <= missing) {
              targetIndicators.indicator_contributing = (
                Number(element.indicator_new) +
                Number(targetIndicators.indicator_contributing)
              ).toString();
              if (
                Number(targetIndicators.indicator_contributing) -
                  Number(element.target_value) ==
                0
              ) {
                targetIndicators.status = 2;
              }
            }
            if (
              element.indicator_new != 0 &&
              Number(targetIndicators.indicator_contributing) !=
                Number(element.target_value)
            ) {
              targetIndicators.status = 1;
            }
            if (missing == 0) {
              targetIndicators.status = 2;
            }
            targetIndicators.is_active = true;
            targetIndicators.is_not_aplicable = element.is_not_aplicable;
          } else {
            targetIndicators.indicator_contributing =
              element.indicator_contributing;
            targetIndicators.is_active = true;
            targetIndicators.is_not_aplicable = element.is_not_aplicable;
          }
          await this._resultsTocResultIndicator.update(
            {
              result_toc_result_indicator_id:
                targetIndicators.result_toc_result_indicator_id,
            },
            targetIndicators,
          );
        } else {
          if (element.is_calculable) {
            element.indicator_contributing = element.indicator_new;
            if (Number(element.indicator_contributing) != 0) {
              element.status = 1;
            } else if (element.indicator_contributing == element.target_value) {
              element.status = 2;
            } else {
              element.status = 0;
            }
          } else {
            element.indicator_contributing = element.indicator_contributing;
            element.status = 3;
          }
          await this._resultsTocResultIndicator.save(element);
        }
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: `updateResultByInitiative ${error}`,
        debug: true,
      });
    }
  }

  async getImpactAreaTargetsToc(resultId, toc_result_id, init) {
    try {
      const queryTocIndicators = `
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
	) `;
      console.log(resultId);

      const impactAreaTarget = await this.query(
        `select * from results_toc_result where results_id = ${resultId} and is_active = true and initiative_id = ${init};`,
      );
      let auxImpactAreaTargets = [];
      let returnInfo = [];
      if (
        impactAreaTarget != null &&
        impactAreaTarget[0]?.result_toc_result_id != null
      ) {
        auxImpactAreaTargets =
          await this._resultsTocImpactAreaTargetRepository.find({
            where: {
              result_toc_result_id: impactAreaTarget[0]?.result_toc_result_id,
            },
          });
        const queryImpactAreaTargets = `
    select * 
	  from clarisa_global_targets cgt 
		join clarisa_impact_areas cia on cgt.impactAreaId = cia.id 
	  where targetId in (select impact_area_indicator_id from result_toc_impact_area_target where result_toc_result_id = ? and is_active >0 )
    `;
        returnInfo = await this.query(queryImpactAreaTargets, [
          impactAreaTarget[0]?.result_toc_result_id,
        ]);
      }

      if (returnInfo.length != 0) {
        return returnInfo;
      } else {
        let innovatonUseInterface = await this.query(queryTocIndicators, [
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
        `select * from results_toc_result where results_id = ${resultId} and is_active = true and initiative_id = ${init};`,
      );
      let auxImpactAreaTargets = [];
      let returnInfo = [];
      if (
        impactAreaTarget != null &&
        impactAreaTarget[0]?.result_toc_result_id != null
      ) {
        auxImpactAreaTargets = await this._resultsTocSdgTargetRepository.find({
          where: {
            result_toc_result_id: impactAreaTarget[0]?.result_toc_result_id,
          },
        });
        const queryImpactAreaTargets = `
   select * 
    from clarisa_sdgs_targets  cgt 
      join clarisa_sdgs cs on cs.usnd_code = cgt.usnd_code 
    where cgt.id  in (select clarisa_sdg_target_id from result_toc_sdg_targets where result_toc_result_id = ? and is_active >0 )
   `;
        returnInfo = await this.query(queryImpactAreaTargets, [
          impactAreaTarget[0]?.result_toc_result_id,
        ]);
      }

      if (returnInfo.length != 0) {
        return returnInfo;
      } else {
        let innovatonUseInterface = await this.query(queryTocIndicators, [
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

  async saveImpact(id_result_toc_result, impactAreaTargets) {
    try {
      await this._resultsTocImpactAreaTargetRepository.update(
        { result_toc_result_id: id_result_toc_result },
        { is_active: false },
      );
      if (impactAreaTargets.length != 0) {
        for (let impact of impactAreaTargets) {
          let targetIndicators =
            await this._resultsTocImpactAreaTargetRepository.findOne({
              where: {
                result_toc_result_id: id_result_toc_result,
                impact_area_indicator_id: impact.targetId,
              },
            });

          if (targetIndicators != null) {
            targetIndicators.is_active = true;
          } else {
            await this._resultsTocImpactAreaTargetRepository.save({
              result_toc_result_id: id_result_toc_result,
              impact_area_indicator_id: impact.targetId,
            });
          }
        }
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
