import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Result } from './entities/result.entity';
import { HandlersError } from '../../shared/handlers/error.utils';

@Injectable()
export class ResultRepository extends Repository<Result> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError
  ) {
    super(Result, dataSource.createEntityManager());
  }

  async getResultByName(name: string, result_type: number, result_name: number) {
    const queryData = `
    SELECT 
    	ci.id as init_id,
    	ci.short_name,
    	ci.name as init_name,
    	ci.official_code,
    	r.title,
    	r.description
    FROM \`result\` r 
    	inner join results_by_inititiative rbi on rbi.result_id = r.id 
    											and rbi.is_active > 0
    	inner join clarisa_initiatives ci on ci.id = rbi.inititiative_id 
    										and ci.active > 0
    	inner join result_type rt ON rt.id = r.result_type_id 
    	inner join result_level rl on rl.id = rt.result_level_id 
    where r.is_active > 0
    	and r.title like '%\?%'
    	and rt.id = ?;
    `;
    try {
      const completeUser: any[] = await this.query(queryData, [
        name, result_type, result_name
      ]);
      return completeUser[0];
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRepository.name,
        error: error,
        debug: true
      });
    }
  }

  /**
   * !reported_year revisar
   * @returns 
   */
  async AllResults() {
    const queryData = `
    SELECT
        r.id,
        r.title,
        '2022' AS reported_year,
        rt.name AS result_type,
        r.status,
        r.created_date,
        rt.name as result_level_name,
        ci.official_code as submitter,
        r.status,
        if(r.status = 0, 'Editing', 'Submitted') as status_name
    FROM
        result r
        INNER JOIN \`version\` v ON v.id = r.version_id
        INNER JOIN result_type rt ON rt.id = r.result_type_id
        inner join result_level rl on rl.id = rt.result_level_id 	
        inner join results_by_inititiative rbi on rbi.result_id = r.id 
        inner join clarisa_initiatives ci on ci.id = rbi.inititiative_id 
    WHERE
        	r.is_active > 0
       	and rbi.is_active > 0
      	and ci.active > 0;
    `;

    try {
      const results: any[] = await this.query(queryData);
      return results;
    } catch (error) {
      throw {
        message: `[${ResultRepository.name}] => completeAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR
      };
    };
  }

}