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
import { ResultTypeDto } from './dto/result-types.dto';

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

  /**
   * !Revisar asignacion de de parametros sql
   * @param id
   * @param allowDeleted
   * @param version
   * @returns
   */
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
  async AllResults(version: number = 1) {
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
    and r.version_id = ?;
    `;

    try {
      const results: any[] = await this.query(queryData, [version]);
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

  async AllResultsByRoleUsers(userid: number, version: number = 1) {
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
    AND r.version_id = ?;
    `;

    try {
      const results = await this.query(queryData, [userid, version]);
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

  async AllResultsLegacyNewByTitle(title: string, version: number = 1) {
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
      and r.version_id = ?)
    `;

    try {
      const results: DepthSearch[] = await this.query(queryData, [
        `%${title}%`,
        `%${title}%`,
        version,
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
    and r.id = ?;
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

  async getLastResultCode(version: number = 1): Promise<number> {
    const queryData = `
    SELECT max(r.result_code) as last_code from \`result\` r WHERE version_id = ?;
    `;

    try {
      const results: Array<{ last_code }> = await this.query(queryData, [
        version,
      ]);
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

  async transformResultCode(
    resultCode: number,
    version: number = 1,
  ): Promise<number> {
    const queryData = `
    SELECT 
    r.id
    FROM 
    \`result\` r 
    WHERE r.is_active > 0
      and r.version_id = ?
      and r.result_code = ?;
    `;
    try {
      const results: Array<{ id }> = await this.query(queryData, [
        version,
        resultCode,
      ]);
      return results?.length ? results[0].id : null;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getTypesOfResultByCodes(
    resultCodes: number[],
    version: number = 1,
  ): Promise<ResultTypeDto[]> {
    const queryData = `
    select
      r.id as resultId,
      r.result_code as resultCode,
      rt.id as typeId,
      rt.name as typeName
    from result r
    join result_type rt on r.result_type_id = rt.id
    where
      r.is_active = 1
      and r.version_id = ?
      and r.result_code ${resultCodes.length ? `in (${resultCodes})` : '= 0'}
    ;
    `;
    try {
      const results = await this.query(queryData, [version]);
      return results;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getTypesOfResultByInitiative(
    initiativeId: number,
    version: number = 1,
  ): Promise<ResultTypeDto[]> {
    const queryData = `
    select
      r.id as resultId,
      r.result_code as resultCode,
      rt.id as typeId,
      rt.name as typeName
    from result r
    join result_type rt on r.result_type_id = rt.id
left join results_by_inititiative rbi3 on rbi3.result_id = r.id
    where rbi3.inititiative_id = ?
      and r.status = 1
      and r.is_active = 1
      and r.version_id = ?
    ;
    `;
    try {
      const results = await this.query(queryData, [initiativeId, version]);
      return results;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getBasicResultDataForReport(resultCodesArray: number[]) {
    const resultCodes = (resultCodesArray ?? []).join(',');
    const query = `
    select 
    r.result_code as "Result Code",
    rl.name as "Result Level",
    rt.name as "Result Type",
    (case 
      when r.status = 0 then "Editing"
      when r.status = 1 then "Submitted"
      else "Not defined"
    end) as "Status",
    r.title as "Result Title",
    r.description as "Result Description",
    r.lead_contact_person as "Lead Contact Person",
    gtl.title as "Gender Tag Level",
    gtl2.title as "Climate Tag Level",
    if(r.is_krs is null,'Not provided',if(r.is_krs,'Yes','No')) as "Is Key Result Story?",
    -- section 2
    ci.official_code as "Primary Submitter",
    GROUP_CONCAT(distinct ci2.official_code SEPARATOR ', ') as "Contributing Initiative(s)",
    GROUP_CONCAT(CONCAT('(Funder name: ',ci4.acronym,' - ',ci4.name ,', Grant title: ',npp.grant_title,', Center Grant ID: ',IFNULL(npp.center_grant_id, 'Not applicable'),', Lead/Contract Center: ',ci3.name,')') SEPARATOR ', ') as "Non-pooled Project(s)",
   /* GROUP_CONCAT(CONCAT(if(rc.is_primary,'(Primary: ','('),ci4.acronym,' - ',ci4.name,')') SEPARATOR ', ') as "Contributing Center(s)", */
    GROUP_CONCAT(distinct CONCAT(if(rc.is_primary,'(Primary: ','('),ci5.acronym,' - ',ci5.name,')') SEPARATOR ', ') as "Contributing Center(s)",
    CONCAT('(',ci.official_code,' - ',ci.short_name,'): ', 'Toc Level: ' ,IFNULL(tl.name , 'Not provider'), ', ToC result title:' ,IFNULL(tr.title, 'Not provider')) as "ToC Mapping (Primary submitter)",
    GROUP_CONCAT(distinct CONCAT('(',ci6.official_code,' - ',ci6.short_name,'): ', 'Toc Level: ' ,IFNULL(tl2.name , 'Not provider'), ', ToC result title:' ,IFNULL(tr2.title, 'Not provider')) SEPARATOR ', ') as "ToC Mapping (Contributting initiatives)",
    -- section 3
    if(r.no_applicable_partner=1, "No", "Yes") as "Are partners applicable?",
    /* GROUP_CONCAT(DISTINCT concat('(',prt.name, ', Delivery type(s): ', prt.deliveries_type,')') SEPARATOR ', ') as "Partners (with delivery type)",*/
    if(rt.id <> 6,(select GROUP_CONCAT(DISTINCT concat('• ',concat(if(coalesce(ci7.acronym, '') = '', '', concat(ci7.acronym, ' - ')), ci7.name), '; Delivery type(s): ', pdt.name) SEPARATOR '\n')
    FROM results_by_institution rbi
    left join result_by_institutions_by_deliveries_type rbibdt 
          on rbibdt.result_by_institution_id = rbi.id 
        and rbibdt.is_active > 0
    left join clarisa_institutions ci7 
          on ci7.id = rbi.institutions_id
    left JOIN partner_delivery_type pdt 
          on pdt.id = rbibdt.partner_delivery_type_id
      WHERE rbi.result_id = r.id
        and rbi.institution_roles_id = 2
        and rbi.is_active > 0
    GROUP by rbi.result_id), 'Not Applicable') as "Partners (with delivery type) for non-KP results",
      if(rt.id = 6, (SELECT group_concat(distinct concat('• CGSpace Institution: ', rkmi.intitution_name, '; Mapped institution: ', if(rbi.id is null, 'None', concat(concat(if(coalesce(ci8.acronym, '') = '', '', concat(ci8.acronym, ' - ')), ci8.name), '; Delivery type(s): ', pdt.name))) separator '\n')
    FROM results_kp_mqap_institutions rkmi
    left join results_knowledge_product rkp on rkmi.result_knowledge_product_id = rkp.result_knowledge_product_id and rkp.is_active > 0
    left join results_by_institution rbi on	rkmi.results_by_institutions_id = rbi.id and rbi.is_active > 0 and rbi.institution_roles_id = 2
    left join result_by_institutions_by_deliveries_type rbibdt on rbibdt.result_by_institution_id = rbi.id and rbibdt.is_active > 0
    left join clarisa_institutions ci8 on ci8.id = rbi.institutions_id
    left JOIN partner_delivery_type pdt on pdt.id = rbibdt.partner_delivery_type_id
    WHERE rkmi.is_active > 0 and rkp.results_id = r.id
    GROUP by rkp.results_id), 'Not Applicable') as "Partners (with delivery type) for KP results",
    -- section 4
    (SELECT if(cgs.name is null, 'Not Provided', (if(cgs.id = 3, 'National', cgs.name))) 
  FROM clarisa_geographic_scope cgs
 WHERE cgs.id = r.geographic_scope_id
 GROUP BY cgs.id,cgs.name) as "Geographic Focus",
    ( SELECT GROUP_CONCAT(DISTINCT cr.name separator ', ')
     FROM result_region rr
left join clarisa_regions cr 
       on cr.um49Code = rr.region_id 
    WHERE rr.result_id  =  r.id
      and rr.is_active = 1) as "Regions",
     (SELECT if(rt.id<>6, GROUP_CONCAT(DISTINCT cc3.name separator ', '), rkp.cgspace_countries) 
     FROM result_country rc2
left join clarisa_countries cc3 
       on cc3.id = rc2.country_id 
    WHERE rc2.result_id  = r.id
      and rc2.is_active = 1) as "Countries",
    -- section 5
    GROUP_CONCAT(DISTINCT CONCAT('(',res2.result_code,': ',res2.result_type,' - ', res2.title,')')) as "Linked Results",
 /* GROUP_CONCAT(DISTINCT lr2.legacy_link separator ', ') as "Results from previous portfolio", */
 (SELECT GROUP_CONCAT(DISTINCT lr2.legacy_link separator ', ')
  FROM linked_result lr2
 WHERE lr2.origin_result_id = 28
    and lr2.linked_results_id is NULL 
    and lr2.is_active > 0
    and lr2.legacy_link is not NULL) as "Results from previous portfolio",
    -- section 6
   /* GROUP_CONCAT(DISTINCT CONCAT('• Link: ', e.link, '; Gender related? ', IF(COALESCE(e.gender_related, 0) = 1, 'Yes', 'No'), '; Youth related? ', IF(COALESCE(e.youth_related, 0) = 1, 'Yes', 'No'), '; Details: ', COALESCE(e.description, 'Not Provided')) SEPARATOR '\n') as "Evidences" */
    (SELECT GROUP_CONCAT(DISTINCT CONCAT('• Link: ', e.link, '; Gender related? ', IF(COALESCE(e.gender_related, 0) = 1, 'Yes', 'No'), '; Youth related? ', IF(COALESCE(e.youth_related, 0) = 1, 'Yes', 'No'), '; Details: ', COALESCE(e.description, 'Not Provided')) SEPARATOR '\n') 
  FROM evidence e
 WHERE e.result_id = r.id
   AND e.is_active > 0) as "Evidences"
    FROM 
    result r
    left join gender_tag_level gtl on gtl.id = r.gender_tag_level_id 
    left join gender_tag_level gtl2 on gtl2.id = r.climate_change_tag_level_id 
    left join results_by_inititiative rbi on rbi.result_id = r.id 
    and rbi.initiative_role_id = 1
    and rbi.is_active > 0
    left join clarisa_initiatives ci on ci.id = rbi.inititiative_id
    left join results_by_inititiative rbi2 on rbi2.result_id = r.id 
    and rbi2.initiative_role_id = 2
    and rbi2.is_active > 0
    left join clarisa_initiatives ci2 on ci2.id = rbi2.inititiative_id 
    left join result_level rl ON rl.id = r.result_level_id 
    left join result_type rt on rt.id = r.result_type_id 
    left join non_pooled_project npp on npp.results_id = r.id 
    and npp.is_active > 0
    left JOIN clarisa_center cc on cc.code = npp.lead_center_id 
    left join clarisa_institutions ci3 on ci3.id = cc.institutionId 
    left join clarisa_institutions ci4 on ci4.id = npp.funder_institution_id 
    left join results_center rc on rc.result_id = r.id 
    and rc.is_active > 0
    left join clarisa_center cc2 on cc2.code = rc.center_id 
    left join clarisa_institutions ci5 on ci5.id = cc2.institutionId 
    left join results_toc_result rtr on rtr.results_id = r.id 
    and rtr.initiative_id = ci.id 
    and rtr.is_active > 0
    left join toc_result tr on tr.toc_result_id = rtr.toc_result_id
    left join toc_level tl on tl.toc_level_id = tr.toc_level_id 
    left join results_toc_result rtr2 on rtr2.results_id = r.id 
    and rtr2.initiative_id <> ci.id 
    and rtr2.is_active > 0
    left join clarisa_initiatives ci6 on ci6.id = rtr2.initiative_id 
    left join toc_result tr2 on tr2.toc_result_id = rtr2.toc_result_id
    left join toc_level tl2 on tl2.toc_level_id = tr2.toc_level_id
/*  left join (select rbi3.result_id, ci7.name, GROUP_CONCAT(pdt.name separator ', ') as deliveries_type  
    from results_by_institution rbi3 
    left join result_by_institutions_by_deliveries_type rbibdt on rbibdt.result_by_institution_id = rbi3.id 
    and rbibdt.is_active > 0
    left join clarisa_institutions ci7 on ci7.id = rbi3.institutions_id
    left JOIN partner_delivery_type pdt on pdt.id = rbibdt.partner_delivery_type_id
    WHERE rbi3.institution_roles_id = 2
    and rbi3.is_active > 0
    GROUP by rbi3.result_id, ci7.name) prt on prt.result_id = r.id */
  /*  left join result_region rr ON rr.result_id = r.id 
    and rr.is_active > 0
    left join clarisa_regions cr on cr.um49Code = rr.region_id 
    left join result_country rc2 on rc2.result_id = r.id 
    and rc2.is_active > 0
    left join clarisa_countries cc3 on cc3.id = rc2.country_id 
    left join clarisa_geographic_scope cgs ON cgs.id = r.geographic_scope_id */
    left join linked_result lr on lr.origin_result_id = r.id
    and lr.linked_results_id is not NULL 
    and lr.is_active > 0
    and lr.legacy_link is NULL 
    left join (select r2.id, r2.result_code, r2.title, rt2.name as result_type 
    from result r2 
    left join result_type rt2 on rt2.id = r2.result_type_id
    where r2.is_active > 0) res2 on res2.id = lr.linked_results_id
   /* left join linked_result lr2 on lr2.origin_result_id = r.id
    and lr2.linked_results_id is NULL 
    and lr2.is_active > 0
    and lr2.legacy_link is not NULL */
    left join results_knowledge_product rkp on rkp.results_id = r.id and rkp.is_active > 0
  /*  left join evidence e on e.result_id = r.id and e.is_active > 0 */
    WHERE r.result_code ${resultCodes.length ? `in (${resultCodes})` : '= 0'}
    GROUP by 
    r.result_code,
    r.id,
    r.title,
    r.description,
    gtl.title,
    gtl2.title,
    rl.name,
    rt.name,
    r.is_krs,
    r.lead_contact_person,
    ci.official_code,
    rtr.result_toc_result_id,
    ci.official_code,
    ci.short_name,
    r.no_applicable_partner,
    rkp.cgspace_countries,
    rt.id
    `;

    try {
      const results = await this.query(query);
      return results;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getBasicResultDataForReportByInitiative(initiativeId: number) {
    const inititiative_id = initiativeId;

    const query = `
    select 
    r.result_code as "Result Code",
    rl.name as "Result Level",
    rt.name as "Result Type",
    (case 
      when r.status = 0 then "Editing"
      when r.status = 1 then "Submitted"
      else "Not defined"
    end) as "Status",
    r.title as "Result Title",
    r.description as "Result Description",
    r.lead_contact_person as "Lead Contact Person",
    gtl.title as "Gender Tag Level",
    gtl2.title as "Climate Tag Level",
    if(r.is_krs is null,'Not provided',if(r.is_krs,'Yes','No')) as "Is Key Result Story?",
    -- section 2
    ci.official_code as "Primary Submitter",
    GROUP_CONCAT(distinct ci2.official_code SEPARATOR ', ') as "Contributing Initiative(s)",
    GROUP_CONCAT(CONCAT('(Funder name: ',ci4.acronym,' - ',ci4.name ,', Grant title: ',npp.grant_title,', Center Grant ID: ',IFNULL(npp.center_grant_id, 'Not applicable'),', Lead/Contract Center: ',ci3.name,')') SEPARATOR ', ') as "Non-pooled Project(s)",
   /* GROUP_CONCAT(CONCAT(if(rc.is_primary,'(Primary: ','('),ci4.acronym,' - ',ci4.name,')') SEPARATOR ', ') as "Contributing Center(s)", */
    GROUP_CONCAT(distinct CONCAT(if(rc.is_primary,'(Primary: ','('),ci5.acronym,' - ',ci5.name,')') SEPARATOR ', ') as "Contributing Center(s)",
    CONCAT('(',ci.official_code,' - ',ci.short_name,'): ', 'Toc Level: ' ,IFNULL(tl.name , 'Not provider'), ', ToC result title:' ,IFNULL(tr.title, 'Not provider')) as "ToC Mapping (Primary submitter)",
    GROUP_CONCAT(distinct CONCAT('(',ci6.official_code,' - ',ci6.short_name,'): ', 'Toc Level: ' ,IFNULL(tl2.name , 'Not provider'), ', ToC result title:' ,IFNULL(tr2.title, 'Not provider')) SEPARATOR ', ') as "ToC Mapping (Contributting initiatives)",
    -- section 3
    if(r.no_applicable_partner=1, "No", "Yes") as "Are partners applicable?",
    /* GROUP_CONCAT(DISTINCT concat('(',prt.name, ', Delivery type(s): ', prt.deliveries_type,')') SEPARATOR ', ') as "Partners (with delivery type)",*/
    if(rt.id <> 6,(select GROUP_CONCAT(DISTINCT concat('• ',concat(if(coalesce(ci7.acronym, '') = '', '', concat(ci7.acronym, ' - ')), ci7.name), '; Delivery type(s): ', pdt.name) SEPARATOR '\n')
    FROM results_by_institution rbi
    left join result_by_institutions_by_deliveries_type rbibdt 
          on rbibdt.result_by_institution_id = rbi.id 
        and rbibdt.is_active > 0
    left join clarisa_institutions ci7 
          on ci7.id = rbi.institutions_id
    left JOIN partner_delivery_type pdt 
          on pdt.id = rbibdt.partner_delivery_type_id
      WHERE rbi.result_id = r.id
        and rbi.institution_roles_id = 2
        and rbi.is_active > 0
    GROUP by rbi.result_id), 'Not Applicable') as "Partners (with delivery type) for non-KP results",
      if(rt.id = 6, (SELECT group_concat(distinct concat('• CGSpace Institution: ', rkmi.intitution_name, '; Mapped institution: ', if(rbi.id is null, 'None', concat(concat(if(coalesce(ci8.acronym, '') = '', '', concat(ci8.acronym, ' - ')), ci8.name), '; Delivery type(s): ', pdt.name))) separator '\n')
    FROM results_kp_mqap_institutions rkmi
    left join results_knowledge_product rkp on rkmi.result_knowledge_product_id = rkp.result_knowledge_product_id and rkp.is_active > 0
    left join results_by_institution rbi on	rkmi.results_by_institutions_id = rbi.id and rbi.is_active > 0 and rbi.institution_roles_id = 2
    left join result_by_institutions_by_deliveries_type rbibdt on rbibdt.result_by_institution_id = rbi.id and rbibdt.is_active > 0
    left join clarisa_institutions ci8 on ci8.id = rbi.institutions_id
    left JOIN partner_delivery_type pdt on pdt.id = rbibdt.partner_delivery_type_id
    WHERE rkmi.is_active > 0 and rkp.results_id = r.id
    GROUP by rkp.results_id), 'Not Applicable') as "Partners (with delivery type) for KP results",
    -- section 4
    (SELECT if(cgs.name is null, 'Not Provided', (if(cgs.id = 3, 'National', cgs.name))) 
  FROM clarisa_geographic_scope cgs
 WHERE cgs.id = r.geographic_scope_id
 GROUP BY cgs.id,cgs.name) as "Geographic Focus",
    ( SELECT GROUP_CONCAT(DISTINCT cr.name separator ', ')
     FROM result_region rr
left join clarisa_regions cr 
       on cr.um49Code = rr.region_id 
    WHERE rr.result_id  =  r.id
      and rr.is_active = 1) as "Regions",
     (SELECT if(rt.id<>6, GROUP_CONCAT(DISTINCT cc3.name separator ', '), rkp.cgspace_countries) 
     FROM result_country rc2
left join clarisa_countries cc3 
       on cc3.id = rc2.country_id 
    WHERE rc2.result_id  = r.id
      and rc2.is_active = 1) as "Countries",
    -- section 5
    GROUP_CONCAT(DISTINCT CONCAT('(',res2.result_code,': ',res2.result_type,' - ', res2.title,')')) as "Linked Results",
 /* GROUP_CONCAT(DISTINCT lr2.legacy_link separator ', ') as "Results from previous portfolio", */
 (SELECT GROUP_CONCAT(DISTINCT lr2.legacy_link separator ', ')
  FROM linked_result lr2
 WHERE lr2.origin_result_id = 28
    and lr2.linked_results_id is NULL 
    and lr2.is_active > 0
    and lr2.legacy_link is not NULL) as "Results from previous portfolio",
    -- section 6
   /* GROUP_CONCAT(DISTINCT CONCAT('• Link: ', e.link, '; Gender related? ', IF(COALESCE(e.gender_related, 0) = 1, 'Yes', 'No'), '; Youth related? ', IF(COALESCE(e.youth_related, 0) = 1, 'Yes', 'No'), '; Details: ', COALESCE(e.description, 'Not Provided')) SEPARATOR '\n') as "Evidences" */
    (SELECT GROUP_CONCAT(DISTINCT CONCAT('• Link: ', e.link, '; Gender related? ', IF(COALESCE(e.gender_related, 0) = 1, 'Yes', 'No'), '; Youth related? ', IF(COALESCE(e.youth_related, 0) = 1, 'Yes', 'No'), '; Details: ', COALESCE(e.description, 'Not Provided')) SEPARATOR '\n') 
  FROM evidence e
 WHERE e.result_id = r.id
   AND e.is_active > 0) as "Evidences"
    FROM 
    result r
    left join gender_tag_level gtl on gtl.id = r.gender_tag_level_id 
    left join gender_tag_level gtl2 on gtl2.id = r.climate_change_tag_level_id 
    left join results_by_inititiative rbi on rbi.result_id = r.id 
    and rbi.initiative_role_id = 1
    and rbi.is_active > 0
    left join clarisa_initiatives ci on ci.id = rbi.inititiative_id
    left join results_by_inititiative rbi2 on rbi2.result_id = r.id 
    and rbi2.initiative_role_id = 2
    and rbi2.is_active > 0
    left join clarisa_initiatives ci2 on ci2.id = rbi2.inititiative_id 
    left join result_level rl ON rl.id = r.result_level_id 
    left join result_type rt on rt.id = r.result_type_id 
    left join non_pooled_project npp on npp.results_id = r.id 
    and npp.is_active > 0
    left JOIN clarisa_center cc on cc.code = npp.lead_center_id 
    left join clarisa_institutions ci3 on ci3.id = cc.institutionId 
    left join clarisa_institutions ci4 on ci4.id = npp.funder_institution_id 
    left join results_center rc on rc.result_id = r.id 
    and rc.is_active > 0
    left join clarisa_center cc2 on cc2.code = rc.center_id 
    left join clarisa_institutions ci5 on ci5.id = cc2.institutionId 
    left join results_toc_result rtr on rtr.results_id = r.id 
    and rtr.initiative_id = ci.id 
    and rtr.is_active > 0
    left join toc_result tr on tr.toc_result_id = rtr.toc_result_id
    left join toc_level tl on tl.toc_level_id = tr.toc_level_id 
    left join results_toc_result rtr2 on rtr2.results_id = r.id 
    and rtr2.initiative_id <> ci.id 
    and rtr2.is_active > 0
    left join clarisa_initiatives ci6 on ci6.id = rtr2.initiative_id 
    left join toc_result tr2 on tr2.toc_result_id = rtr2.toc_result_id
    left join toc_level tl2 on tl2.toc_level_id = tr2.toc_level_id
/*  left join (select rbi3.result_id, ci7.name, GROUP_CONCAT(pdt.name separator ', ') as deliveries_type  
    from results_by_institution rbi3 
    left join result_by_institutions_by_deliveries_type rbibdt on rbibdt.result_by_institution_id = rbi3.id 
    and rbibdt.is_active > 0
    left join clarisa_institutions ci7 on ci7.id = rbi3.institutions_id
    left JOIN partner_delivery_type pdt on pdt.id = rbibdt.partner_delivery_type_id
    WHERE rbi3.institution_roles_id = 2
    and rbi3.is_active > 0
    GROUP by rbi3.result_id, ci7.name) prt on prt.result_id = r.id */
  /*  left join result_region rr ON rr.result_id = r.id 
    and rr.is_active > 0
    left join clarisa_regions cr on cr.um49Code = rr.region_id 
    left join result_country rc2 on rc2.result_id = r.id 
    and rc2.is_active > 0
    left join clarisa_countries cc3 on cc3.id = rc2.country_id 
    left join clarisa_geographic_scope cgs ON cgs.id = r.geographic_scope_id */
    left join linked_result lr on lr.origin_result_id = r.id
    and lr.linked_results_id is not NULL 
    and lr.is_active > 0
    and lr.legacy_link is NULL 
    left join (select r2.id, r2.result_code, r2.title, rt2.name as result_type 
    from result r2 
    left join result_type rt2 on rt2.id = r2.result_type_id
    where r2.is_active > 0) res2 on res2.id = lr.linked_results_id
   /* left join linked_result lr2 on lr2.origin_result_id = r.id
    and lr2.linked_results_id is NULL 
    and lr2.is_active > 0
    and lr2.legacy_link is not NULL */
    left join results_knowledge_product rkp on rkp.results_id = r.id and rkp.is_active > 0
  /*  left join evidence e on e.result_id = r.id and e.is_active > 0 */
    left join results_by_inititiative rbi3 on rbi3.result_id = r.id
    WHERE rbi3.inititiative_id = ${inititiative_id}
      AND r.status = 1
    GROUP by 
    r.result_code,
    r.id,
    r.title,
    r.description,
    gtl.title,
    gtl2.title,
    rl.name,
    rt.name,
    r.is_krs,
    r.lead_contact_person,
    ci.official_code,
    rtr.result_toc_result_id,
    ci.official_code,
    ci.short_name,
    r.no_applicable_partner,
    rkp.cgspace_countries,
    rt.id
    `;

    try {
      const results = await this.query(query);
      return results;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getActiveResultCodes() {
    try {
      const resultCodes = await this.find({
        where: { is_active: true },
        select: { id: true, result_code: true },
      });
      return resultCodes;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
