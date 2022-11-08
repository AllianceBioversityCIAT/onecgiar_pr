import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
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
    tr.titel,
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

  async getAllTocResultsByInitiative(initId: number, tocLevel: number) {
    const queryData = `
    select 
      tr.toc_result_id ,
      tr.toc_internal_id ,
      tr.titel,
      tr.description,
      tr.toc_type_id,
      tr.toc_level_id ,
      tr.inititiative_id ,
      tr.work_package_id 
    from toc_result tr
    where tr.inititiative_id = ?
    	and tr.toc_level_id = ?;
    `;
    try {
      const tocResult:TocResult[] = await this.query(queryData, [initId, tocLevel]);
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
      r.result_title as titel,
      wp.pathway_content as description,
      r.result_type_id as toc_level_id,
      null as toc_type_id,
      i.id as inititiative_id,
      wp.wp_official_code as work_package_id,
      r.active
      from submissiontooldb.results r
      left join submissiontooldb.work_packages wp on r.work_package_id = wp.wp_official_code
      											and r.initvStgId = wp.initvStgId
      											and r.active > 0
      inner join submissiontooldb.initiatives_by_stages ibs on ibs.id = r.initvStgId
      inner join submissiontooldb.initiatives i on  ibs.initiativeId = i.id
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
}

