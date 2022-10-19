import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Version } from './entities/version.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';

@Injectable()
export class VersionRepository extends Repository<Version> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(Version, dataSource.createEntityManager());
  }

  async getBaseVersion() {
    const queryData = `
    select min(v.id) as id,
    		v.version_name,
    		null as start_date,
    		null as end_date
    from \`version\` v 
    	where (v.start_date = ''
    		or v.start_date is null)
    		and
    		(v.end_date  = ''
    		or v.end_date is null)
    group by v.id, v.version_name;
    `;
    try {
      const version: Version[] = await this.query(queryData);
      return version.length ? version[0] : [];
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: VersionRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
