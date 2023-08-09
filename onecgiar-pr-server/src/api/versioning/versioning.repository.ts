import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Version } from './entities/version.entity';
import {
  HandlersError,
  ReturnResponse,
} from '../../shared/handlers/error.utils';
import { env } from 'process';
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
    } catch (error) {
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
      `;
    return this.query(queryData, [result_id])
      .then((res: { version_id: number }[]) => {
        return res.map((item) => item.version_id);
      })
      .catch((err) => {
        return [];
      });
  }

  $_getAllInovationDevToReplicate(phase: Version): Promise<Result[]> {
    const queryData = `
    select *
    from \`result\` r 
    left join (select r2.result_code 
    			from \`result\` r2 
    			where r2.result_type_id = 7 
    				and r2.is_active > 0 
    				and r2.version_id = ?) rv on rv.result_code = r.result_code 
    where r.result_type_id = 7
    and r.version_id = ?
    and r.status_id = 2
    and r.is_active > 0
    and rv.result_code is null;
      `;
    return this.query(queryData, [phase.id, phase.obj_previous_phase.id])
      .then((res) => {
        return res;
      })
      .catch((err) => {
        return [];
      });
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
    } catch (error) {
      return {
        status: null,
        type: null,
      };
    }
  }
}
