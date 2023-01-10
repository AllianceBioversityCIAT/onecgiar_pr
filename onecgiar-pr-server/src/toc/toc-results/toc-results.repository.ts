import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { env } from 'process';
import { DataSource, Repository } from 'typeorm';
import { TocResult } from './entities/toc-result.entity';

@Injectable()
export class TocResultsRepository extends Repository<TocResult> {
  constructor(private dataSource: DataSource) {
    super(TocResult, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM toc_result;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllTocResults() {
    const queryData = `
    select 
    tr.toc_result_id ,
    tr.toc_internal_id ,
    tr.title,
    tr.description,
    tr.toc_type_id,
    tr.toc_level_id ,
    tr.inititiative_id ,
    tr.work_package_id 
    from toc_result tr;
    `;
    try {
      const tocResult:TocResult[] = await this.query(queryData);
      return tocResult;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => getAllTocResults error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllTocResultsByInitiative(initiativeId: number, tocLevel: number) {
    const queryData = `
    select DISTINCT
      tr.toc_result_id ,
      tr.toc_internal_id ,
      tr.title,
      tr.description,
      tr.toc_type_id,
      tr.toc_level_id ,
      tr.inititiative_id ,
      tr.work_package_id ,
      wp.acronym as wp_short_name,
      null as action_area_outcome_id
    from toc_result tr
    left join ${env.DB_OST}.work_packages wp on wp.wp_official_code = tr.work_package_id
	  where tr.inititiative_id = ?
    	and tr.toc_level_id = ?
      and tr.is_active > 0
    order by tr.title ASC;
    `,
    queryOst = `
    select
    	null as toc_result_id,
    	ibs.initiativeId as inititiative_id ,
    	iaaoi.outcome_id as action_area_outcome_id,
    	caao.id,
    	caao.outcomeSMOcode as title,
    	caao.outcomeStatement as description,
    	4 as toc_level_id,
    	null as work_package_id,
    	gi.action_area_id,
      gi.action_area_description as action_area_name
    from
    	${env.DB_OST}.init_action_areas_out_indicators iaaoi
    inner join ${env.DB_OST}.initiatives_by_stages ibs on
    	ibs.id = iaaoi.initvStgId
    inner join ${env.DB_OST}.general_information gi on gi.initvStgId = ibs.id 
    inner join ${env.DB_NAME}.clarisa_action_area_outcome caao on
    	caao.id = iaaoi.outcome_id
    WHERE
    	iaaoi.outcome_id is not null
    	and ibs.initiativeId = ?
    GROUP by
    	ibs.initiativeId,
    	iaaoi.outcome_id,
    	gi.action_area_id,
    	gi.action_area_description
    order by caao.outcomeSMOcode ASC;
    `;

    try {
      const tocResult:TocResult[] = await this.query(tocLevel == 4? queryOst:queryData, [initiativeId, tocLevel]);
      return tocResult;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => getTocIdFromOst error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllTocResultsFromOst() {
    const queryData = `
    select 
      r.id as toc_result_id,
      r.toc_result_id as toc_internal_id,
      r.result_title as title,
      wp.pathway_content as description,
      r.result_type_id as toc_level_id,
      null as toc_type_id,
      i.id as inititiative_id,
      wp.wp_official_code as work_package_id,
      r.active as is_active
      from ${env.DB_OST}.results r
      left join ${env.DB_OST}.work_packages wp on r.work_package_id = wp.wp_official_code
      											and r.initvStgId = wp.initvStgId
      											and r.active > 0
      inner join ${env.DB_OST}.initiatives_by_stages ibs on ibs.id = r.initvStgId
      inner join ${env.DB_OST}.initiatives i on  ibs.initiativeId = i.id
      WHERE r.active > 0 
	      and ibs.active > 0;
    `;
    try {
      const tocResult:TocResult[] = await this.query(queryData);
      return tocResult;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => getTocIdFromOst error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async inactiveTocResult(){
    const queryData = `
      UPDATE toc_result 
        set is_active = 0;
    `;
    try {
      const tocResult:TocResult[] = await this.query(queryData);
      return tocResult;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => inactiveTocResult error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async updateDeprecateDataToc(){
    const queryData = `
    update
        results_toc_result rtr
      left join toc_result tr on
        tr.toc_result_id = rtr.toc_result_id
      left join toc_result tr2 on
        tr2.title = tr.title
        and tr2.is_active > 0
        and tr2.inititiative_id = tr.inititiative_id 
         set
        rtr.toc_result_id = IFNULL(tr2.toc_result_id, NULL)
      WHERE
        tr.is_active = 0;
    `;
    try {
      const tocResult:TocResult[] = await this.query(queryData);
      return tocResult;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => inactiveTocResult error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllOutcomeByInitiative(initiativeId: number) {
    const queryData = `
    select  
      DISTINCT caaoi.outcome_id as action_area_outcome_id,
      ibs.initiativeId as inititiative_id ,
       caao.id,
       caao.outcomeSMOcode as title,
       caao.outcomeStatement as description,
       4 as toc_level_id,
        null as work_package_id,
        gi.action_area_id,
       gi.action_area_description as action_area_name
      from ${env.DB_OST}.general_information gi 
      inner join ${env.DB_OST}.initiatives_by_stages ibs on gi.initvStgId = ibs.id 
      													and ibs.active > 0
      inner join ${env.DB_OST}.clarisa_action_areas_outcomes_indicators caaoi on caaoi.action_area_id = gi.action_area_id
      inner join clarisa_action_area_outcome caao on caao.id = caaoi.outcome_id 
      where ibs.initiativeId = ?;
    `;
    try {
      const tocResult:TocResult[] = await this.query(queryData, [initiativeId]);
      return tocResult;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => getTocIdFromOst error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getFullInitiativeTocByResult(resultId: number) {
    const queryData = `
    select 
      rbi.result_id,
      rbi.inititiative_id,
      ci.toc_id 
      from results_by_inititiative rbi 
      inner join clarisa_initiatives ci on ci.id = rbi.inititiative_id
      where rbi.result_id = ?
        and rbi.initiative_role_id = 1;
    `;
    try {
      const tocid = await this.query(queryData, [resultId]);
      return tocid;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => getTocIdFromOst error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async isTocResoultByInitiative(resultId: number, tResult: number) {
    const queryData = `
    select 
      tr.toc_result_id ,
      tr.toc_internal_id ,
      tr.title,
      tr.description,
      tr.toc_type_id,
      tr.toc_level_id ,
      tr.inititiative_id ,
      tr.work_package_id 
      from toc_result tr
      inner join results_by_inititiative rbi on rbi.inititiative_id = tr.inititiative_id 
      where rbi.initiative_role_id = 1
      and rbi.result_id = ${resultId}
      and tr.toc_result_id = ${tResult};
    `;
    try {
      const tocResult:TocResult[] = await this.query(queryData);
      return tocResult.length? tocResult[0]: undefined;
    } catch (error) {
      throw {
        message: `[${TocResultsRepository.name}] => getAllTocResults error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}

