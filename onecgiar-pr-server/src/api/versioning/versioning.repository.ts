import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Version } from './entities/version.entity';
import {
  HandlersError,
  ReturnResponse,
} from '../../shared/handlers/error.utils';
import { Result } from '../results/entities/result.entity';

@Injectable()
export class VersionRepository extends Repository<Version> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
    private readonly _returnResponse: ReturnResponse,
  ) {
    super(Version, dataSource.createEntityManager());
  }

  async getBaseVersion() {
    const queryData = `
    select min(v.id) as id,
    		v.phase_name as version_name,
    		null as start_date,
    		null as end_date
    from \`version\` v 
    	where (v.start_date = ''
    		or v.start_date is null)
    		and
    		(v.end_date  = ''
    		or v.end_date is null)
        and v.status > 0
        and v.is_active > 0
    group by v.id, v.phase_name;
    `;
    try {
      const version: Version[] = await this.query(queryData);
      return version.length ? version[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: VersionRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async $_closeAllPhases(appModuleId: number): Promise<boolean> {
    try {
      const queryData = `
      update \`version\` 
      set status = false
      where is_active > 0 and status = true and app_module_id = ?;
      `;
      await this.query(queryData, [appModuleId]);
      return true;
    } catch (_error) {
      return false;
    }
  }

  $_getVersionOfAResult(result_id: number): Promise<number[]> {
    const queryData = `
    select
    r2.version_id
  from
    \`result\` r2
  where
    r2.result_code = (
    select
      r.result_code
    from
      \`result\` r
    where
      r.id = ?)
    and r2.is_active > 0
      `;
    return this.query(queryData, [result_id])
      .then((res: { version_id: number }[]) => {
        return res.map((item) => item.version_id);
      })
      .catch((_err) => {
        return [];
      });
  }

  $_getAllInovationDevToReplicate(
    phase: Version,
    result_type = 7,
  ): Promise<Result[]> {
    const queryData = `
    SELECT
        r.*
    FROM
        result r
        LEFT JOIN (
            SELECT
                r2.result_code
            FROM
                result r2
            WHERE
                r2.result_type_id = ${result_type}
                AND r2.is_active > 0
                AND r2.version_id = ?
        ) rv ON rv.result_code = r.result_code
    WHERE
        r.result_type_id = ${result_type}
        AND r.version_id = ?
        AND r.is_active > 0
        AND rv.result_code IS NULL;
      `;
    return this.query(queryData, [phase.id, phase.obj_previous_phase.id])
      .then((res) => {
        return res;
      })
      .catch((_err) => {
        return [];
      });
  }

  $_getAllInovationPackageToReplicate(
    phase: Version,
    result_type = 10,
  ): Promise<Result[]> {
    const queryData = `
    select r.*
    from \`result\` r 
    left join (select r2.result_code 
    			from \`result\` r2 
    			where r2.result_type_id = ${result_type} 
    				and r2.is_active > 0 
    				and r2.version_id = ?) rv on rv.result_code = r.result_code 
    where r.result_type_id = ${result_type}
    and r.version_id = ?
    and r.is_active > 0
    and rv.result_code is null;
      `;
    return this.query(queryData, [phase.id, phase.obj_previous_phase.id])
      .then((res) => {
        return res;
      })
      .catch((_err) => {
        return [];
      });
  }

  $_setQaStatusToResult(results_id: number[]) {
    if (!results_id?.length) return null;
    const queryData = `
    update \`result\` r 
    set r.status_id = 2
    where r.id in (${results_id.join(',')})}) 
    	and r.is_active > 0;
    `;
    return this.query(queryData)
      .then((res) => res)
      .catch((_err) => null);
  }

  $_updateLinkResultByPhase(phase_id: number) {
    const queryData = `
    update linked_result lr 
    	inner join \`result\` r on r.id = lr.linked_results_id 
    	left join \`result\` r2 ON r2.result_code = r.result_code 
    							and r2.version_id = ?
    							and r2.status_id = 2
    set lr.linked_results_id = IFNULL(r2.id, r.id) 
    where lr.is_active > 0
    	and r.version_id = ?;`;
    return this.query(queryData, [phase_id, phase_id])
      .then((res) => res)
      .catch((_err) => null);
  }

  async getDataStatusAndTypeResult(status_id: number, type_id: number) {
    const queryDataSr = `select rs.status_name from result_status rs where rs.result_status_id = ? limit 1;`;
    const queryDataTP = `select rt.name from result_type rt where rt.id = ? limit 1;`;
    try {
      const sr = await this.query(queryDataSr, [status_id]);
      const rt = await this.query(queryDataTP, [type_id]);
      return {
        status: sr.length ? sr[0].status_name : null,
        type: rt.length ? rt[0].name : null,
      };
    } catch (_error) {
      return {
        status: null,
        type: null,
      };
    }
  }
}
