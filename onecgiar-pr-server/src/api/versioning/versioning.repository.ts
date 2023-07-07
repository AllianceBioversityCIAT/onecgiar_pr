import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Version } from './entities/version.entity';
import {
  HandlersError,
  ReturnResponse,
} from '../../shared/handlers/error.utils';
import { env } from 'process';

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
}
