import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Result } from './entities/result.entity';
import { HandlersError } from '../../shared/handlers/error.utils';
import { DepthSearch } from './dto/depth-search.dto';
import { DepthSearchOne } from './dto/depth-search-one.dto';
import { ResultLevelType } from './dto/result-level-type.dto';

@Injectable()
export class ResultRepository extends Repository<Result> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(Result, dataSource.createEntityManager());
  }

  async getResultByName(
    name: string,
    result_type: number,
    result_name: number,
  ) {
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
        name,
        result_type,
        result_name,
      ]);
      return completeUser[0];
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRepository.name,
        error: error,
        debug: true,
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
    r.reported_year_id AS reported_year,
    rt.name AS result_type,
    r.created_date,
    ci.official_code AS submitter,
    ci.id AS submitter_id,
    r.status,
    IF(r.status = 0, 'Editing', 'Submitted') AS status_name
FROM
    result r
    INNER JOIN result_type rt ON rt.id = r.result_type_id
    INNER JOIN results_by_inititiative rbi ON rbi.result_id = r.id
    INNER JOIN clarisa_initiatives ci ON ci.id = rbi.inititiative_id
WHERE
    r.is_active > 0
    AND rbi.is_active > 0
    AND ci.active > 0;
    `;

    try {
      const results: any[] = await this.query(queryData);
      return results;
    } catch (error) {
      throw {
        message: `[${ResultRepository.name}] => completeAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getResultsById(id: number) {
    const queryData = `
    SELECT
    r.id,
    r.title,
    r.reported_year_id AS reported_year,
    rt.name AS result_type,
    r.created_date,
    ci.official_code AS submitter,
    ci.id AS submitter_id,
    r.status,
    IF(r.status = 0, 'Editing', 'Submitted') AS status_name
FROM
    result r
    INNER JOIN result_type rt ON rt.id = r.result_type_id
    INNER JOIN results_by_inititiative rbi ON rbi.result_id = r.id
    INNER JOIN clarisa_initiatives ci ON ci.id = rbi.inititiative_id
WHERE
    r.is_active > 0
    AND rbi.is_active > 0
    AND ci.active > 0
    AND r.id = ?;
    `;

    try {
      const results: any[] = await this.query(queryData, [id]);
      return results;
    } catch (error) {
      throw {
        message: `[${ResultRepository.name}] => getResultsById error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async AllResultsByRoleUsers(userid: number) {
    const queryData = `
    SELECT
    r.id,
    r.title,
    r.reported_year_id AS reported_year,
    rt.name AS result_type,
    rt.id AS result_type_id,
    r.created_date,
    ci.official_code AS submitter,
    ci.id AS submitter_id,
    r.status,
    IF(r.status = 0, 'Editing', 'Submitted') AS status_name,
    r2.id as role_id,
    r2.description as role_name,
    if(y.\`year\` = r.reported_year_id, 'New', '') as is_new,
    r.result_level_id
FROM
    \`result\` r
    INNER JOIN result_type rt ON rt.id = r.result_type_id
    inner join result_level rl on rl.id = r.result_level_id 
    INNER JOIN results_by_inititiative rbi ON rbi.result_id = r.id
    INNER JOIN clarisa_initiatives ci ON ci.id = rbi.inititiative_id
    left join role_by_user rbu on rbu.initiative_id = rbi.inititiative_id 
    							and rbu.\`user\`  = ?
    left join \`role\` r2 on r2.id  = rbu.\`role\` 
    left join \`year\` y ON y.active > 0
WHERE
    r.is_active > 0
    AND rbi.is_active > 0
    AND ci.active > 0;
    `;

    try {
      const results = await this.query(queryData, [userid]);
      return results;
    } catch (error) {
      throw {
        message: `[${ResultRepository.name}] => completeAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async AllResultsLegacyNewByTitle(title: string) {
    const queryData = `
    (select 
      lr.legacy_id as id,
      lr.title,
      lr.description,
      lr.crp,
      lr.\`year\`,
      1 as legacy,
      null as result_level_id,
      null as result_type_name
    from legacy_result lr
    where lr.title like ?
      and lr.is_migrated = 0)
    union
    (select 
      r.id,
      r.title,
      r.description,
      ci.official_code as crp,
      r.reported_year_id as \`year\`,
      0 as legacy,
      r.result_level_id,
      rt.name as result_type_name
    from \`result\` r 
      inner join results_by_inititiative rbi on rbi.result_id = r.id
                          and rbi.initiative_role_id = 1
                          and rbi.is_active > 0
      inner join clarisa_initiatives ci on ci.id = rbi.inititiative_id
                          and ci.active > 0
      inner join result_type rt on rt.id = r.result_type_id 
    where r.is_active > 0
      and r.title like ?)
    `;

    try {
      const results: DepthSearch[] = await this.query(queryData, [
        `%${title}%`,
        `%${title}%`,
      ]);
      return results;
    } catch (error) {
      throw {
        message: `[${ResultRepository.name}] => completeAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async findResultsLegacyNewById(id: string) {
    const queryData = `
    (select 
      lr.legacy_id as id,
      lr.title,
      lr.description,
      lr.crp,
      lr.\`year\`,
      1 as legacy,
      lr.is_migrated
    from legacy_result lr
    where lr.legacy_id = ?
      and lr.is_migrated = 0)
    union
    (select 
      r.id,
      r.title,
      r.description,
      ci.official_code as crp,
      r.reported_year_id as \`year\`,
      0 as legacy,
      1 as is_migrated
    from \`result\` r 
      inner join results_by_inititiative rbi on rbi.result_id = r.id
                          and rbi.initiative_role_id = 1
                          and rbi.is_active > 0
      inner join clarisa_initiatives ci on ci.id = rbi.inititiative_id
                          and ci.active > 0
    where r.is_active > 0
    and r.id = ?)
    `;

    try {
      const results: DepthSearchOne[] = await this.query(queryData, [id, id]);
      return results.length ? results[0] : new DepthSearchOne();
    } catch (error) {
      throw {
        message: `[${ResultRepository.name}] => completeAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getResultById(id: number): Promise<Result> {
    const queryData = `
    SELECT
    r.id,
    r.description,
    r.is_active,
    r.last_updated_date,
    r.gender_tag_level_id,
    r.version_id,
    r.result_type_id,
    r.status,
    r.created_by,
    r.last_updated_by,
    r.reported_year_id,
    r.created_date,
    r.result_level_id,
    r.title,
    r.legacy_id,
    r.applicable_partner
FROM
    result r
    inner join results_by_inititiative rbi ON rbi.result_id = r.id 
    									and rbi.is_active > 0
WHERE
    r.is_active > 0
    and r.id = ?;
    `;

    try {
      const results: Result[] = await this.query(queryData, [id]);
      return results.length? results[0]: undefined;
    } catch (error) {
      throw {
        message: `[${ResultRepository.name}] => completeAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getResultAndLevelTypeById(id: number): Promise<ResultLevelType> {
    const queryData = `
    SELECT
    r.id,
    r.description,
    r.is_active,
    r.last_updated_date,
    r.gender_tag_level_id,
    r.version_id,
    r.result_type_id,
    rt.name as result_type_name,
    r.status,
    r.created_by,
    r.last_updated_by,
    r.reported_year_id,
    r.created_date,
    r.result_level_id,
    rl.name as result_level_name,
    r.title,
    r.legacy_id,
    r.climate_change_tag_level_id,
    r.is_krs,
    r.krs_url
FROM
    result r
    inner join results_by_inititiative rbi ON rbi.result_id = r.id 
    									and rbi.is_active > 0
    inner join result_level rl on rl.id = r.result_level_id 
    inner join result_type rt on rt.id = r.result_type_id 
WHERE
    r.is_active > 0
    and r.id = ?;
    `;

    try {
      const results: ResultLevelType[] = await this.query(queryData, [id]);
      return results.length? results[0]: new ResultLevelType();
    } catch (error) {
      throw {
        message: `[${ResultRepository.name}] => completeAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
