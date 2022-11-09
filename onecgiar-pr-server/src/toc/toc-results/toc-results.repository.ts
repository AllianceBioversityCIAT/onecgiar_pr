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

  async getAllTocResultsByInitiative(resultId: number, tocLevel: number) {
    const queryData = `
    select 
      tr.toc_result_id ,
      tr.toc_internal_id ,
      tr.title,
      tr.description,
      tr.toc_type_id,
      tr.toc_level_id ,
      tr.inititiative_id ,
      tr.work_package_id ,
      null as outcome_id
    from toc_result tr
    inner join results_by_inititiative rbi on rbi.inititiative_id = tr.inititiative_id 
										and rbi.initiative_role_id = 1
	  where rbi.result_id = ?
    	and tr.toc_level_id = ?;
    `,
    queryOst = `
    select
    	null as toc_result_id,
    	ibs.initiativeId as inititiative_id ,
    	iaaoi.outcome_id,
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
    inner join results_by_inititiative rbi on
    	rbi.inititiative_id = ibs.initiativeId
    	and rbi.initiative_role_id = 1
    WHERE
    	iaaoi.outcome_id is not null
    	and rbi.result_id = 1
    GROUP by
    	ibs.initiativeId,
    	iaaoi.outcome_id;
    `;


    try {
      const tocResult:TocResult[] = await this.query(tocLevel == 4? queryOst:queryData, [resultId, tocLevel]);
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
      r.active
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

  async getFullInitiativeTocByResult(resultId: number) {
    const queryData = `
    select 
      rbi.result_id,
      rbi.inititiative_id,
      ci.toc_id 
      from results_by_inititiative rbi 
      inner join clarisa_initiatives ci on ci.id = rbi.inititiative_id
      where rbi.result_id = ?;
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
}

