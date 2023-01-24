import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Result } from './entities/result.entity';
import { HandlersError } from '../../shared/handlers/error.utils';
import { DepthSearch } from './dto/depth-search.dto';
import { DepthSearchOne } from './dto/depth-search-one.dto';
import { ResultLevelType } from './dto/result-level-type.dto';
import { ResultSimpleDto } from './dto/result-simple.dto';
import { ResultDataToMapDto } from './dto/result-data-to-map.dto';
import { LegacyIndicatorsPartner } from './legacy_indicators_partners/entities/legacy_indicators_partner.entity';
import { env } from 'process';

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
    	r.description,
      r.no_applicable_partner,
      r.geographic_scope_id 
    FROM \`result\` r 
    	inner join results_by_inititiative rbi on rbi.result_id = r.id 
    											and rbi.is_active > 0
    	inner join clarisa_initiatives ci on ci.id = rbi.inititiative_id 
    										and ci.active > 0
    	inner join result_type rt ON rt.id = r.result_type_id 
    	inner join result_level rl on rl.id = rt.result_level_id 
    where r.is_active > 0
    	and r.title like '%\?%'
    	and rt.id = ?
      and r.version_id = 1;
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

  async resultsForElasticSearch(
    id?: string,
    allowDeleted: boolean = false,
  ): Promise<ResultSimpleDto[]> {
    const queryData = `
    select
      q1.*
    from
      (
      select
        concat(r.id, '') as id,
        r.result_code,
        r.title,
        r.description,
        concat(ci.official_code, '-', ci.short_name) as crp,
        group_concat(distinct cc.name separator ';') as countries,
        group_concat(distinct cr.name separator ';') as regions,
        r.reported_year_id as year,
        rt.name as type,
        'false' as is_legacy
      from
        result r
      left join results_by_inititiative rbi on
        rbi.result_id = r.id
        and rbi.is_active > 0
        and rbi.initiative_role_id = 1
      left join result_type rt on
        rt.id = r.result_type_id
      left join clarisa_initiatives ci on
        ci.id = rbi.inititiative_id
      left join result_region rr on
        rr.result_id = r.id
        and rr.is_active > 0
      left join clarisa_regions cr on
        cr.um49Code = rr.region_id
      left join result_country rc on
        rc.result_id = r.id
        and rc.is_active > 0
      left join clarisa_countries cc on
        cc.id = rc.country_id
      where
        r.version_id = 1
        ${!allowDeleted ? 'and r.is_active > 0' : ''}
      group by
        r.id,
        r.title,
        r.description,
        ci.official_code,
        ci.short_name,
        r.reported_year_id,
        rt.name,
        is_legacy
    union
      select
        lr.legacy_id as id,
        lr.legacy_id as result_code,
        lr.title,
        lr.description,
        lr.crp,
        group_concat(distinct cc.name separator ';') as countries,
        group_concat(distinct cr.name separator ';') as regions,
        lr.year,
        lr.indicator_type as type,
        'true' as is_legacy
      from
        legacy_result lr
      left join legacy_indicators_locations lil_country on
        lil_country.legacy_id = lr.legacy_id
      left join clarisa_countries cc on
        cc.iso_alpha_2 = lil_country.iso_alpha_2
      left join legacy_indicators_locations lil_region on
        lil_region.legacy_id = lr.legacy_id
      left join clarisa_regions cr on
        cr.um49Code = lil_region.um49_code
      left join result r on
        r.legacy_id = lr.legacy_id
      where lr.indicator_type != 'MELIA'
      group by
        lr.legacy_id,
        lr.title,
        lr.description,
        lr.crp,
        lr.year,
        lr.indicator_type,
        is_legacy
        ) as q1
    ${
      id
        ? `where
      q1.id = ?`
        : ''
    }
    ;
    `;

    try {
      const results: any[] = await this.query(queryData, id ? [id] : []);
      return results;
    } catch (error) {
      throw {
        message: `[${ResultRepository.name}] => allResultsForElasticSearch error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getResultInfoToMap(resultId: number): Promise<ResultDataToMapDto> {
    const query = `
      select
        r.title as result_title,
        rt.name as result_type,
        r.id as result_id,
        ci.id as result_primary_submitter_id,
        ci.official_code as result_primary_submitter_official_code
      from
        result r
      inner join result_type rt on
        r.result_type_id = rt.id
      inner join results_by_inititiative rbi on
        rbi.result_id = r.id
        and rbi.initiative_role_id = 1
      inner join clarisa_initiatives ci on
        rbi.inititiative_id = ci.id
      where
        r.id = ?
        and r.version_id = 1;
    `;
    try {
      const result = await this.query(query, [resultId]);
      return result?.[0] as ResultDataToMapDto;
    } catch (error) {
      throw {
        message: `[${ResultRepository.name}] => getResultInfoToMap error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
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
    r.result_code,
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
    r.no_applicable_partner,
    r.geographic_scope_id,
    rbi.inititiative_id as initiative_id,
    rl.name as result_level_name,
    rt.name as result_type_name,
    r.has_regions,
    r.has_countries,
    ci.name as initiative_name,
    ci.short_name as initiative_short_name,
    ci.official_code as initiative_official_code
FROM
    result r
    inner join results_by_inititiative rbi ON rbi.result_id = r.id 
    									and rbi.is_active > 0
                      and rbi.initiative_role_id = 1
    inner join result_level rl on rl.id = r.result_level_id 
    inner join result_type rt on rt.id = r.result_type_id 
    inner join clarisa_initiatives ci on ci.id = rbi.inititiative_id 
WHERE
    r.is_active > 0
    and r.version_id = 1;
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

  /*async getResultsById(id: number) {
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
    IF(r.status = 0, 'Editing', 'Submitted') AS status_name,
    r.no_applicable_partner
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
  }*/

  async AllResultsByRoleUsers(userid: number) {
    const queryData = `
    SELECT
    r.id,
    r.result_code,
    r.title,
    r.reported_year_id AS reported_year,
    rt.name AS result_type,
    rl.name AS result_level_name,
    rt.id AS result_type_id,
    r.created_date,
    ci.official_code AS submitter,
    ci.id AS submitter_id,
    r.status,
    IF(r.status = 0, 'Editing', 'Submitted') AS status_name,
    r2.id as role_id,
    r2.description as role_name,
    if(y.\`year\` = r.reported_year_id, 'New', '') as is_new,
    r.result_level_id,
    r.no_applicable_partner,
    if(r.geographic_scope_id in (3, 4), 3, r.geographic_scope_id ) as geographic_scope_id,
    r.legacy_id,
    r.created_by,
    u.first_name as create_first_name,
    u.last_name as create_last_name
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
    left join users u on u.id = r.created_by
WHERE
    r.is_active > 0
    AND rbi.is_active > 0
    AND rbi.initiative_role_id = 1
    AND ci.active > 0
    AND r.version_id = 1;
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

  async reportingResultList(initDate: Date, endDate: Date) {
    const queryData = `
    SELECT
      r.result_code as \`Result code\`,
    	r.reported_year_id as \`Reporting year\`,
    	r.title as \`Result title\`,
    	CONCAT(rl.name, ' - ', rt.name) as \`Result type\`,
      (Select gtl2.description from gender_tag_level gtl2 where id = r.gender_tag_level_id) as \`Gender tag\`, 
      (Select gtl2.description from gender_tag_level gtl2 where id = r.climate_change_tag_level_id) as \`Climate tag\`,
    	ci.official_code as \`Submitter\` ,
    	if(r.status = 0,
    	'Editing',
    	'Submitted') as \`Status\`,
    	DATE_FORMAT(r.created_date, "%Y-%m-%d") as \`Creation date\`,
    	tr.work_package_id as \`Work package id\`,
    	wp.name as \`Work package title\`,
    	rtr.toc_result_id as \`Toc result id\`,
    	tr.title as \`ToC result\`,
    	rtr.action_area_outcome_id as \`Action area outcome id\`,
    	caao.outcomeStatement as \`Action area outcome name\`,
    	GROUP_CONCAT(CONCAT('[', cc.code, ': ', ci2.acronym, ' - ', ci2.name, ']') SEPARATOR ', ') as \`Centers\`,
      GROUP_CONCAT(DISTINCT cin2.official_code SEPARATOR ', ') as \`Contributing Initiatives\` 
    from
    	\`result\` r
    inner join result_type rt on
    	rt.id = r.result_type_id
    inner join result_level rl on
    	rl.id = r.result_level_id
    inner join results_by_inititiative rbi on
    	rbi.result_id = r.id
    	and rbi.initiative_role_id = 1
    	and rbi.is_active > 0
    left join results_by_inititiative rbi2 on
    	rbi2.result_id = r.id
    	and rbi2.initiative_role_id = 2
    	and rbi2.is_active > 0
    inner join clarisa_initiatives ci on
    	ci.id = rbi.inititiative_id
    left join clarisa_initiatives cin2 on
    	cin2.id = rbi2.inititiative_id
    left join results_toc_result rtr on
    	rtr.results_id = r.id
    	and rtr.initiative_id = rbi.inititiative_id
    	and rtr.is_active > 0
    left join results_center rc on
    	rc.result_id = r.id
    	and rc.is_active > 0
    left join clarisa_center cc on
    	cc.code = rc.center_id
    left join clarisa_institutions ci2 on
    	ci2.id = cc.institutionId
      and ci2.is_active > 0
    left join toc_result tr on
    	tr.toc_result_id = rtr.toc_result_id
    left join clarisa_action_area_outcome caao ON
    	caao.id = rtr.action_area_outcome_id
    left join ${env.DB_OST}.work_packages wp on
    	wp.id = tr.work_package_id
    	and wp.active > 0
    WHERE
    	r.created_date >= ?
    	and r.created_date <= ?
      and r.version_id = 1
    GROUP by
    	r.id,
    	r.reported_year_id,
    	r.title,
    	rl.name,
    	rt.name,
    	ci.official_code,
    	r.status,
    	r.created_date,
    	tr.work_package_id,
    	wp.name,
    	rtr.toc_result_id,
    	tr.title,
    	rtr.action_area_outcome_id,
    	caao.outcomeStatement
    order by r.created_date DESC;`;

    try {
      const results = await this.query(queryData, [initDate, endDate]);
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
      lr.legacy_id as result_code,
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
      r.result_code,
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
      and r.title like ?
      and r.version_id = 1)
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
      lr.legacy_id as result_code,
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
      r.result_code,
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
    and r.id = ?
    and r.version_id = 1)
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

  async findLegacyPartner(id: string) {
    const queryData = `
    select * from legacy_indicators_partners where legacy_id = ?
    `;

    try {
      const partners: LegacyIndicatorsPartner[] = await this.query(queryData, [
        id,
        id,
      ]);
      return partners;
    } catch (error) {
      throw {
        message: `[${LegacyIndicatorsPartner.name}] => completeAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getResultById(id: number): Promise<Result> {
    const queryData = `
    SELECT
    r.id,
    r.result_code,
    r.description,
    r.is_active,
    r.last_updated_date,
    r.gender_tag_level_id,
    r.climate_change_tag_level_id,
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
    r.no_applicable_partner,
    r.geographic_scope_id,
    rbi.inititiative_id as initiative_id,
    rl.name as result_level_name,
    rt.name as result_type_name,
    r.has_regions,
    r.has_countries,
    ci.name as initiative_name,
    ci.short_name as initiative_short_name,
    ci.official_code as initiative_official_code,
    r.lead_contact_person
FROM
    result r
    inner join results_by_inititiative rbi ON rbi.result_id = r.id 
    									and rbi.is_active > 0
                      and rbi.initiative_role_id = 1
    inner join result_level rl on rl.id = r.result_level_id 
    inner join result_type rt on rt.id = r.result_type_id 
    inner join clarisa_initiatives ci on ci.id = rbi.inititiative_id 
WHERE
    r.is_active > 0
    and r.id = ?
    and r.version_id = 1;
    `;

    try {
      const results: Result[] = await this.query(queryData, [id]);
      return results.length ? results[0] : undefined;
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
    r.result_code,
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
    r.krs_url,
    r.no_applicable_partner,
    r.geographic_scope_id,
    r.lead_contact_person,
    if(r.geographic_scope_id in (3, 4), 3, r.geographic_scope_id ) as geographic_scope_id
FROM
    result r
    inner join results_by_inititiative rbi ON rbi.result_id = r.id 
    									and rbi.is_active > 0
    inner join result_level rl on rl.id = r.result_level_id 
    inner join result_type rt on rt.id = r.result_type_id 
WHERE
    r.is_active > 0
    and r.id = ?
    and r.version_id = 1;
    `;

    try {
      const results: ResultLevelType[] = await this.query(queryData, [id]);
      return results.length ? results[0] : new ResultLevelType();
    } catch (error) {
      throw {
        message: `[${ResultRepository.name}] => completeAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getLastResultCode(): Promise<number> {
    const queryData = `
    SELECT max(r.result_code) as last_code from \`result\` r WHERE version_id = 1;
    `;

    try {
      const results: Array<{ last_code }> = await this.query(queryData);
      return results.length ? parseInt(results[0].last_code) : null;
    } catch (error) {
      throw {
        message: `[${ResultRepository.name}] => getLastResultCode error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllResultId(): Promise<Array<{ id }>> {
    const queryData = `
    SELECT 
    r.id
    FROM 
    \`result\` r 
    WHERE r.is_active > 0
      and r.version_id = 1;
    `;
    try {
      const results: Array<{ id }> = await this.query(queryData);
      return results;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async transformResultCode(resultCode: number): Promise<number> {
    const queryData = `
    SELECT 
    r.id
    FROM 
    \`result\` r 
    WHERE r.is_active > 0
      and r.version_id = 1
      and r.result_code = ?;
    `;
    try {
      const results: Array<{ id }> = await this.query(queryData, [resultCode]);
      return results?.length?results[0].id:null;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
