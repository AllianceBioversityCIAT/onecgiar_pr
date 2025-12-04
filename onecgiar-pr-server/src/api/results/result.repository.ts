import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
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
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../shared/globalInterfaces/replicable.interface';

import { LogicalDelete } from '../../shared/globalInterfaces/delete.interface';
import { predeterminedDateValidation } from '../../shared/utils/versioning.utils';
import { BaseRepository } from '../../shared/extendsGlobalDTO/base-repository';
import { ReportParametersDto } from './dto/report-parameters.dto';
import { EnvironmentExtractor } from '../../shared/utils/environment-extractor';

@Injectable()
export class ResultRepository
  extends BaseRepository<Result>
  implements LogicalDelete<Result>
{
  createQueries(
    config: ReplicableConfigInterface<Result>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      select
        null as id,
        r2.description,
        r2.is_active,
        null as last_updated_date,
        r2.gender_tag_level_id,
        ${config.phase} as version_id,
        r2.result_type_id,
        0 as status,
        1 as status_id,
        ${config.user.id} as created_by,
        ${config.user.id} as last_updated_by,
        (select v.phase_year  from \`version\` v where v.id = ${
          config.phase
        }) as reported_year_id,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date,
        r2.result_level_id,
        r2.title,
        r2.legacy_id,
        r2.krs_url,
        r2.is_krs,
        r2.climate_change_tag_level_id,
        r2.no_applicable_partner,
        r2.has_regions,
        r2.has_countries,
        r2.geographic_scope_id,
        r2.lead_contact_person,
        r2.result_code,
        true as is_replicated
        from \`result\` r2 WHERE r2.id = ${
          config.old_result_id
        } and r2.is_active > 0`,
      insertQuery: `
      insert into \`result\` (
        description
        ,is_active
        ,last_updated_date
        ,gender_tag_level_id
        ,version_id
        ,result_type_id
        ,status
        ,status_id
        ,created_by
        ,last_updated_by
        ,reported_year_id
        ,created_date
        ,result_level_id
        ,title
        ,legacy_id
        ,krs_url
        ,is_krs
        ,climate_change_tag_level_id
        ,no_applicable_partner
        ,has_regions
        ,has_countries
        ,geographic_scope_id
        ,lead_contact_person
        ,result_code,
        nutrition_tag_level_id,
        environmental_biodiversity_tag_level_id,
        poverty_tag_level_id,
        is_replicated
        ) select
        r2.description,
        r2.is_active,
        null as last_updated_date,
        r2.gender_tag_level_id,
        ${config.phase} as version_id,
        r2.result_type_id,
        0 as status,
        1 as status_id,
        ${config.user.id} as created_by,
        ${config.user.id} as last_updated_by,
        (select v.phase_year  from \`version\` v where v.id = ${
          config.phase
        }) as reported_year_id,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date,
        r2.result_level_id,
        r2.title,
        r2.legacy_id,
        r2.krs_url,
        r2.is_krs,
        r2.climate_change_tag_level_id,
        r2.no_applicable_partner,
        r2.has_regions,
        r2.has_countries,
        r2.geographic_scope_id,
        r2.lead_contact_person,
        r2.result_code,
        r2.nutrition_tag_level_id,
        r2.environmental_biodiversity_tag_level_id,
        r2.poverty_tag_level_id,
        true as is_replicated
        from \`result\` r2 WHERE r2.id = ${
          config.old_result_id
        } and r2.is_active > 0`,
      returnQuery: `
      select
        r2.*
        from \`result\` r2 WHERE r2.id = ?
      `,
    };
  }
  private readonly _logger: Logger = new Logger(ResultRepository.name);
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(Result, dataSource.createEntityManager());
  }
  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete r from \`result\` r where r.id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          className: ResultRepository.name,
          error: err,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<Result> {
    const queryData = `update \`result\` set is_active = 0 where id = ?`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          className: ResultRepository.name,
          error: err,
          debug: true,
        }),
      );
  }

  async countResultByTypeAndStatus(status_id, result_type_id) {
    try {
      const queryData = `select count(1) as \`count\` from \`result\` r where r.status_id = ? and r.result_type_id = ?;`;
      const res = await this.query(queryData, [status_id, result_type_id]);
      return res.length ? res[0].count : null;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async findIdOfResultByTypeAndStatus(status_id, result_type_id) {
    try {
      const queryData = `select r.id from \`result\` r where r.status_id = ? and r.result_type_id = ?;`;
      const res = await this.query(queryData, [status_id, result_type_id]);
      return res.map((item) => item.id);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRepository.name,
        error: error,
        debug: true,
      });
    }
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
   * @param id
   * @param allowDeleted
   * @param version
   * @returns
   */
  async resultsForElasticSearch(
    id?: string,
    allowDeleted = false,
  ): Promise<ResultSimpleDto[]> {
    const queryData = `
    select
      q1.*
    from
      (
      select
        concat(r.id, '') as id,
        r.result_code,
        r.version_id,
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
      where r.result_type_id not in (10,11) 
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
        null as version_id,
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
        r.id = ?;
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
    r.status_id,
    rs.status_name,
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
    INNER JOIN result_status rs ON rs.result_status_id = r.status_id 
WHERE
    r.is_active > 0;
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

  async AllResultsByRoleUserAndInitiative(
    userid: number,
    excludeType = [10, 11],
    initiativeCode?: string,
  ) {
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
        ci.name AS submitter_name,
        ci.short_name AS submitter_short_name,
        ci.id AS submitter_id,
        r.status,
        r.status_id,
        rs.status_name AS status_name,
        r2.id as role_id,
        r2.description as role_name,
        if(y.\`year\` = r.reported_year_id, 'New', '') as is_new,
        v.phase_year,
        r.result_level_id,
        r.no_applicable_partner,
        if(r.geographic_scope_id in (3, 4), 3, r.geographic_scope_id ) as geographic_scope_id,
        r.legacy_id,
        r.created_by,
        u.first_name as create_first_name,
        u.last_name as create_last_name,
        r.version_id,
        CONCAT(v.phase_name, ' - ', cp.acronym) as phase_name,
        v.status as phase_status,
        r.in_qa as inQA,
        ci.portfolio_id,
        cp.name as portfolio_name,
        cp.acronym as acronym
    FROM
        \`result\` r
        INNER JOIN result_type rt ON rt.id = r.result_type_id
        inner join result_level rl on rl.id = r.result_level_id 
        INNER JOIN results_by_inititiative rbi ON rbi.result_id = r.id
        INNER JOIN clarisa_initiatives ci ON ci.id = rbi.inititiative_id
        LEFT JOIN clarisa_portfolios cp ON ci.portfolio_id = cp.id
        left join role_by_user rbu on rbu.initiative_id = rbi.inititiative_id 
                      and rbu.\`user\` = ?
                      and rbu.active = 1
        left join \`role\` r2 on r2.id  = rbu.\`role\` 
        left join \`year\` y ON y.active > 0
        left join users u on u.id = r.created_by
        inner join \`version\` v on v.id = r.version_id
        INNER JOIN result_status rs ON rs.result_status_id = r.status_id 
    WHERE
        r.is_active > 0
        AND rbi.is_active > 0
        AND rbi.initiative_role_id = 1
        AND ci.active > 0
        AND rt.id not in (${excludeType.toString()})
        ${initiativeCode ? 'AND ci.official_code = ?' : ''};
    `;

    try {
      const results = await this.query(
        queryData,
        ([userid] as (string | number)[]).concat(
          initiativeCode ? [initiativeCode] : [],
        ),
      );
      return results;
    } catch (error) {
      throw {
        message: `[${ResultRepository.name}] => completeAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getUserRolesForResults(
    userId: number,
    resultIds: (number | string)[],
  ): Promise<
    Array<{
      result_id: number;
      role_id: number | null;
      role_name: string | null;
    }>
  > {
    if (!Number.isFinite(Number(userId)) || !resultIds?.length) {
      return [];
    }

    const normalizedIds = resultIds
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));

    if (!normalizedIds.length) {
      return [];
    }

    const placeholders = normalizedIds.map(() => '?').join(', ');

    const query = `
      SELECT
        r.id AS result_id,
        rbu.\`role\` AS role_id,
        ro.description AS role_name
      FROM result r
      INNER JOIN results_by_inititiative rbi
        ON rbi.result_id = r.id
        AND rbi.is_active = 1
        AND rbi.initiative_role_id = 1
      INNER JOIN clarisa_initiatives ci
        ON ci.id = rbi.inititiative_id
        AND ci.active > 0
      LEFT JOIN role_by_user rbu
        ON rbu.initiative_id = rbi.inititiative_id
        AND rbu.\`user\` = ?
        AND rbu.active = 1
      LEFT JOIN \`role\` ro
        ON ro.id = rbu.\`role\`
      WHERE
        r.id IN (${placeholders})
        AND r.is_active > 0;
    `;

    try {
      return await this.query(query, [userId, ...normalizedIds]);
    } catch (error) {
      throw {
        message: `[${ResultRepository.name}] => getUserRolesForResults error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async AllResultsByRoleUserAndInitiativeFiltered(
    userid: number,
    filters?: {
      initiativeCode?: string | string[];
      versionId?: number | number[];
      submitterId?: number | number[];
      resultTypeId?: number | number[];
      portfolioId?: number | number[];
      statusId?: number | number[];
    },
    excludeType = [10, 11],
    pagination?: { limit?: number; offset?: number },
  ) {
    const baseQuery = `
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
        ci.name AS submitter_name,
        ci.short_name AS submitter_short_name,
        ci.id AS submitter_id,
        r.status,
        r.status_id,
        rs.status_name AS status_name,
        r2.id as role_id,
        r2.description as role_name,
        if(y.year = r.reported_year_id, 'New', '') as is_new,
        v.phase_year,
        r.result_level_id,
        r.no_applicable_partner,
        if(r.geographic_scope_id in (3, 4), 3, r.geographic_scope_id ) as geographic_scope_id,
        r.legacy_id,
        r.created_by,
        u.first_name as create_first_name,
        u.last_name as create_last_name,
        r.version_id,
        CONCAT(v.phase_name, ' - ', cp.acronym) as phase_name,
        v.status as phase_status,
        r.in_qa as inQA,
        ci.portfolio_id,
        cp.name as portfolio_name,
        cp.acronym as acronym
    FROM
        result r
        INNER JOIN result_type rt ON rt.id = r.result_type_id
        inner join result_level rl on rl.id = r.result_level_id 
        INNER JOIN results_by_inititiative rbi ON rbi.result_id = r.id
        INNER JOIN clarisa_initiatives ci ON ci.id = rbi.inititiative_id
        LEFT JOIN clarisa_portfolios cp ON ci.portfolio_id = cp.id
        left join role_by_user rbu on rbu.initiative_id = rbi.inititiative_id 
                      and rbu.user = ?
                      and rbu.active = 1
        left join role r2 on r2.id  = rbu.role 
        left join year y ON y.active > 0
        left join users u on u.id = r.created_by
        inner join version v on v.id = r.version_id
        INNER JOIN result_status rs ON rs.result_status_id = r.status_id 
    WHERE
        r.is_active > 0
        AND rbi.is_active > 0
        AND rbi.initiative_role_id = 1
        AND ci.active > 0
        AND rt.id not in (${excludeType.toString()})`;

    const params: (string | number)[] = [userid];
    const where: string[] = [];

    const addInGeneric = (
      field: string,
      values?: number | string | (number | string)[],
    ) => {
      if (values === undefined || values === null) return;
      const arr = Array.isArray(values) ? values : [values];
      if (!arr.length) return;
      const placeholders = arr.map(() => '?').join(',');
      where.push(`AND ${field} IN (${placeholders})`);
      params.push(...(arr as (number | string)[]));
    };

    try {
      addInGeneric('ci.official_code', filters?.initiativeCode);
      addInGeneric('r.version_id', filters?.versionId);
      addInGeneric('ci.id', filters?.submitterId);
      addInGeneric('rt.id', filters?.resultTypeId);
      addInGeneric('ci.portfolio_id', filters?.portfolioId);
      addInGeneric('r.status_id', filters?.statusId);

      const limit =
        pagination?.limit && pagination.limit > 0
          ? pagination.limit
          : undefined;
      const offset =
        limit !== undefined &&
        pagination?.offset !== undefined &&
        pagination.offset >= 0
          ? pagination.offset
          : undefined;

      const paginatedClause =
        limit !== undefined
          ? ` LIMIT ${limit}${offset !== undefined ? ` OFFSET ${offset}` : ''}`
          : '';

      const queryData = `${baseQuery} ${where.join(' ')}${paginatedClause};`;
      const results = await this.query(queryData, params);

      if (limit !== undefined) {
        const countQuery = `SELECT COUNT(1) as total FROM (${baseQuery} ${where.join(' ')}) as sub`;
        const totalRows = await this.query(countQuery, params);
        const total = totalRows?.[0]?.total ?? 0;
        return { results, total };
      }

      return { results, total: results.length };
    } catch (error) {
      throw {
        message: `[${ResultRepository.name}] => AllResultsByRoleUserAndInitiativeFiltered error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getResultDataForBasicReport(initDate: Date, endDate: Date) {
    const queryData = `
    SELECT
      r.result_code,
      ANY_VALUE(version.phase_name) AS phase_name,
      ANY_VALUE(r.reported_year_id) AS reported_year_id,
      ANY_VALUE(r.title) AS title,
      REGEXP_REPLACE(REPLACE(REPLACE(r.description, '<', '&lt;'), '>', '&gt;'), '[^[:print:]]', '') AS description,
      ANY_VALUE(CONCAT(rl.name, ' - ', rt.name)) AS "result_type",
      ANY_VALUE(
        IF(
          r.is_krs IS NULL,
          'Not provided',
          IF(r.is_krs, 'Yes', 'No')
        )
      ) AS "is_key_result",
      IFNULL(ANY_VALUE(gtl_gender.description), '') AS "gender_tag_level",
      IFNULL(ANY_VALUE(gtl_climate.description), '') AS "climate_tag_level",
      IFNULL(ANY_VALUE(gtl_nutrition.description), '') AS "nutrition_tag_level",
      IFNULL(ANY_VALUE(gtl_environment.description), '') AS "environment_tag_level",
      IFNULL(ANY_VALUE(gtl_poverty.description), '') AS "poverty_tag_level",
      ANY_VALUE(ci_main.official_code) AS official_code,
      ANY_VALUE(rs.status_name) AS status_name,
      DATE_FORMAT(r.created_date, "%Y-%m-%d") AS "creation_date",
      ANY_VALUE(wp.id) AS "work_package_id",
      REPLACE(REPLACE(IFNULL(ANY_VALUE(wp.name), ''), '<', '&lt;'), '>', '&gt;') AS "work_package_title",
      ANY_VALUE(rtr.toc_result_id) AS toc_result_id,
      REPLACE(REPLACE(IFNULL(ANY_VALUE(tr.result_title), ''), '<', '&lt;'), '>', '&gt;') AS "toc_result_title",
      REPLACE(REPLACE(IFNULL(ANY_VALUE(action_areas_sub.action_areas), ''), '<', '&lt;'), '>', '&gt;') AS action_areas,
      GROUP_CONCAT(
        DISTINCT CONCAT(
          '[',
          cc.code,
          ': ',
          c_inst.acronym,
          ' - ',
          c_inst.name,
          ']'
        ) SEPARATOR ', '
      ) AS "centers",
      GROUP_CONCAT(
        DISTINCT ci_contributor.official_code SEPARATOR ', '
      ) AS "contributing_initiative",
      CONCAT(
        '${env.FRONT_END_PDF_ENDPOINT}',
        r.result_code,
        ?,
        'phase=',
        r.version_id
      ) AS "pdf_link"
    FROM
      result r
      INNER JOIN result_type rt ON rt.id = r.result_type_id
      INNER JOIN result_level rl ON rl.id = r.result_level_id
      INNER JOIN results_by_inititiative rbi_main ON rbi_main.result_id = r.id
      AND rbi_main.initiative_role_id = 1
      AND rbi_main.is_active
      INNER JOIN clarisa_initiatives ci_main ON ci_main.id = rbi_main.inititiative_id
      INNER JOIN result_status rs ON rs.result_status_id = r.status_id
      INNER JOIN version ON version.id = r.version_id
      LEFT JOIN results_by_inititiative rbi_contributor ON rbi_contributor.result_id = r.id
      AND rbi_contributor.initiative_role_id = 2
      AND rbi_contributor.is_active
      LEFT JOIN clarisa_initiatives ci_contributor ON ci_contributor.id = rbi_contributor.inititiative_id
      LEFT JOIN results_toc_result rtr ON rtr.results_id = r.id
      AND rtr.initiative_id = rbi_main.inititiative_id
      AND rtr.is_active
      LEFT JOIN ${env.DB_TOC}.toc_results tr ON rtr.toc_result_id = tr.id
      AND tr.is_active
      LEFT JOIN ${env.DB_TOC}.work_packages wp ON wp.id = tr.work_packages_id
      AND wp.active
      LEFT JOIN results_center rc ON rc.result_id = r.id
      AND rc.is_active
      LEFT JOIN clarisa_center cc ON cc.code = rc.center_id
      LEFT JOIN clarisa_institutions c_inst ON c_inst.id = cc.institutionId
      AND c_inst.is_active
      LEFT JOIN gender_tag_level AS gtl_gender ON gtl_gender.id = r.gender_tag_level_id
      LEFT JOIN gender_tag_level AS gtl_climate ON gtl_climate.id = r.climate_change_tag_level_id
      LEFT JOIN gender_tag_level AS gtl_nutrition ON gtl_nutrition.id = r.nutrition_tag_level_id
      LEFT JOIN gender_tag_level AS gtl_environment ON gtl_environment.id = r.environmental_biodiversity_tag_level_id
      LEFT JOIN gender_tag_level AS gtl_poverty ON gtl_poverty.id = r.poverty_tag_level_id
      LEFT JOIN (
        SELECT
          traar.toc_results_id,
          GROUP_CONCAT(
            DISTINCT CONCAT(caa.id, ' - ', caa.name) SEPARATOR '\n'
          ) AS action_areas
        FROM
          ${env.DB_TOC}.toc_results_action_area_results traar
          INNER JOIN ${env.DB_TOC}.toc_action_area_results taar ON taar.toc_result_id = traar.toc_action_area_results_id_toc
          AND taar.is_active
          RIGHT JOIN clarisa_action_area caa ON taar.action_areas_id = caa.id
        WHERE
          traar.is_active
        GROUP BY
          traar.toc_results_id
      ) AS action_areas_sub ON action_areas_sub.toc_results_id = tr.toc_result_id
    WHERE
      r.created_date BETWEEN ?
      AND ?
      AND r.is_active
      AND r.result_type_id NOT IN (10, 11)
    GROUP BY
      r.id
    ORDER BY
      creation_date DESC;
      `;
    try {
      const results = await this.query(queryData, ['?', initDate, endDate]);

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

  async getResultById(id: number): Promise<any> {
    const queryData = `
    SELECT
    r.id,
    r.result_code,
    r.description,
    r.is_active,
    r.last_updated_date,
    r.gender_tag_level_id,
    r.climate_change_tag_level_id,
    r.nutrition_tag_level_id,
    r.environmental_biodiversity_tag_level_id,
    r.poverty_tag_level_id,
    r.version_id,
    r.result_type_id,
    r.status,
    r.status_id,
    rs.status_name,
    r.created_by,
    r.last_updated_by,
    r.reported_year_id,
    r.created_date,
    r.result_level_id,
    r.title,
    r.legacy_id,
    r.no_applicable_partner,
    r.geographic_scope_id,
    r.has_extra_geo_scope,
    r.extra_geo_scope_id,
    rbi.inititiative_id as initiative_id,
    rl.name as result_level_name,
    rt.name as result_type_name,
    r.has_regions,
    r.has_countries,
    r.has_extra_regions,
    r.has_extra_countries,
    ci.name as initiative_name,
    ci.short_name as initiative_short_name,
    ci.official_code as initiative_official_code,
    r.lead_contact_person,
    v.status as is_phase_open,
    v.phase_name,
    v.phase_year,
    r.is_discontinued,
    r.is_replicated,
    r.in_qa as inQA,
    ci.cgiar_entity_type_id,
    JSON_OBJECT('code', ccet.code, 'name', ccet.name) as  obj_cgiar_entity_type,
    r.is_lead_by_partner,
    v.portfolio_id,
    (
      SELECT
        cp.acronym
      FROM
        clarisa_portfolios cp
      WHERE
        cp.id = v.portfolio_id
    ) AS portfolio
FROM
    \`result\` r
    inner join result_level rl on rl.id = r.result_level_id 
    inner join result_type rt on rt.id = r.result_type_id 
    inner join results_by_inititiative rbi on rbi.result_id = r.id
        and rbi.is_active > 0 
        and rbi.initiative_role_id = 1
    inner join clarisa_initiatives ci on ci.id = rbi.inititiative_id
    INNER JOIN result_status rs ON rs.result_status_id = r.status_id 
    inner join \`version\` v on v.id = r.version_id 
    inner join clarisa_cgiar_entity_types ccet on ccet.code = ci.cgiar_entity_type_id
WHERE
    r.id = ${id}
    and r.is_active > 0;
    `;

    try {
      const results: Result[] = await this.query(queryData);
      return results.length ? results[0] : undefined;
    } catch (error) {
      throw {
        message: `[${ResultRepository.name}] => completeAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
    /*return this.query(queryData, [id])
      .then((res) => {
        setTimeout(() => {}, 500);
        return res.length ? res[0] : undefined;
      })
      .catch((error) => {
        throw {
          message: `[${ResultRepository.name}] => completeAllData error: ${error}`,
          response: {},
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        };
      });*/
  }

  async getResultByTypes(typesId: number[]): Promise<Result[]> {
    const queryData = `
    SELECT
        r.id as result_id,
        r.result_code,
        r.description,
        r.is_active,
        r.last_updated_date,
        r.gender_tag_level_id,
        r.climate_change_tag_level_id,
        r.version_id,
        r.result_type_id,
        r.status,
        r.status_id,
        rs.status_name,
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
        IF(
            r.result_type_id = 7,
            CONCAT(rt.name, ' (QAed)'),
            rt.name
        ) as result_type_name,
        r.has_regions,
        r.has_countries,
        ci.name as initiative_name,
        ci.short_name as initiative_short_name,
        ci.official_code as initiative_official_code,
        r.lead_contact_person
    FROM
        result r
        INNER JOIN results_by_inititiative rbi ON rbi.result_id = r.id
        AND rbi.is_active > 0
        AND rbi.initiative_role_id = 1
        INNER JOIN result_level rl on rl.id = r.result_level_id
        INNER JOIN result_type rt on rt.id = r.result_type_id
        INNER JOIN clarisa_initiatives ci on ci.id = rbi.inititiative_id
        INNER JOIN result_status rs ON rs.result_status_id = r.status_id 
    WHERE
        r.is_active > 0
        AND (
            (
                r.result_type_id = 7
                AND r.status_id = 3
                OR r.status_id = 2
            )
            OR (
                r.result_type_id = 11
                AND r.status_id = 1
                OR r.status_id = 3
            )
        )
        AND result_type_id IN (?)
    ORDER BY
        r.id DESC;
    `;

    try {
      const results: Result[] = await this.query(queryData, [typesId]);
      return results;
    } catch (error) {
      throw {
        message: `[${ResultRepository.name}] => getResultByTypes error: ${error}`,
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
    r.gender_impact_area_id,
    r.result_type_id,
    rt.name as result_type_name,
    r.status,
    r.status_id,
    rs.status_name,
    r.created_by,
    r.last_updated_by,
    r.reported_year_id,
    r.created_date,
    r.result_level_id,
    rl.name as result_level_name,
    r.title,
    r.legacy_id,
    r.climate_change_tag_level_id,
    r.climate_impact_area_id,
    r.nutrition_tag_level_id,
    r.nutrition_impact_area_id,
    r.environmental_biodiversity_tag_level_id,
    r.environmental_biodiversity_impact_area_id,
    r.poverty_tag_level_id,
    r.poverty_impact_area_id,
    r.is_krs,
    r.krs_url,
    r.no_applicable_partner,
    r.geographic_scope_id,
    r.lead_contact_person,
    r.lead_contact_person_id,
    if(r.geographic_scope_id in (3, 4), 3, r.geographic_scope_id ) as geographic_scope_id,
    v.id as version_id,
    v.phase_name,
    v.phase_year,
    r.is_discontinued,
    r.is_replicated
FROM
    result r
    inner join results_by_inititiative rbi ON rbi.result_id = r.id 
    									and rbi.is_active > 0
    inner join result_level rl on rl.id = r.result_level_id 
    inner join result_type rt on rt.id = r.result_type_id 
    inner join \`version\` v on v.id = r.version_id
    INNER JOIN result_status rs ON rs.result_status_id = r.status_id 
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

  async getLastResultCode(): Promise<number> {
    const queryData = `
    SELECT max(r.result_code) as last_code from \`result\` r;
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
    WHERE r.is_active > 0;
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
    version: number = null,
  ): Promise<number> {
    if (!version) return null;
    const queryData = `
    SELECT 
    r.id
    FROM 
    \`result\` r 
    WHERE r.is_active > 0
    and r.result_code = ?
    and r.version_id = ?;
    `;
    try {
      const results: Array<{ id }> = await this.query(queryData, [
        resultCode,
        version,
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
    resultIdsArray: number[],
    version = 18,
  ): Promise<ResultTypeDto[]> {
    const resultIds = (resultIdsArray ?? []).join(',');
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
      and r.id ${resultIdsArray?.length ? `in (${resultIds})` : '= 0'}
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
    phase?: number,
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
      and r.status_id = 3
      and r.is_active = 1
      ${phase ? `and r.version_id = ${phase}` : ''}
    ;
    `;
    try {
      const results = await this.query(queryData, [initiativeId]);
      return results;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  private async _getBasicResultDataForReportByParameters(
    parameters: ReportParametersDto,
  ) {
    let whereClause = '';

    if (parameters.resultIds) {
      whereClause = `WHERE r.id ${
        parameters.resultIds.length
          ? `in (${parameters.resultIds.join(',')})`
          : '= 0'
      } and r.is_active > 0`;
    }

    if (parameters.initiativeIds) {
      whereClause = `${
        whereClause.length ? 'AND' : 'WHERE'
      } rbi.inititiative_id in (${parameters.initiativeIds.join(',')})
      AND r.status_id = 2`;
    }

    const query = `
    SELECT
        -- GENERAL INFORMATION
        DISTINCT r.result_code AS "Result Code",
        (
            SELECT
                v.phase_name
            FROM
                version v
            WHERE
                r.version_id = v.id
        ) AS "Reporting phase",
        CONCAT(
            '${env.FRONT_END_PDF_ENDPOINT}',
            r.result_code,
            "?phase=",
            r.version_id
        ) AS "PDF Link",
        (
            SELECT
                rl.name
            FROM
                result_level rl
            WHERE
                r.result_level_id = rl.id
        ) AS "Result Level",
        (
            SELECT
                rt.name
            FROM
                result_type rt
            WHERE
                r.result_type_id = rt.id
        ) AS "Result Type",
        (
            SELECT
                CONCAT(
                    u.last_name,
                    ', ',
                    u.first_name
                )
            FROM
                users u
            WHERE
                u.id = r.created_by
        ) AS "Created by",
        (
            SELECT
                rs.status_name
            FROM
                result_status rs
            WHERE
                r.status_id = rs.result_status_id
        ) AS "Status",
        r.title AS "Result Title",
        r.description AS "Result Description",
        r.lead_contact_person AS "Lead Contact Person",
        IFNULL(gtl.description, 'Not provided') AS "Gender Tag Level",
        IFNULL(gtl2.description, 'Not provided') AS "Climate Tag Level",
        IFNULL(gtl3.description, 'Not provided') AS "Nutrition Tag Level",
        IFNULL(gtl4.description, 'Not provided') AS "Environment AND/or biodiversity Tag Level",
        IFNULL(gtl5.description, 'Not provided') AS "Poverty Tag Level",
        IF(
            r.is_krs IS NULL,
            'Not provided',
            IF(r.is_krs, 'Yes', 'No')
        ) AS "Is Key Result Story",
        -- THEORY OF CHANGE
        (
            SELECT
                CONCAT(
                    ci.official_code,
                    ' - ',
                    ci.name
                )
            FROM
                clarisa_initiatives ci
            WHERE
                rbi.inititiative_id = ci.id
        ) AS "Primary Submitter",
        IFNULL(
            (
                SELECT
                    GROUP_CONCAT(
                        ci2.official_code,
                        ' - ',
                        ci2.name SEPARATOR '; '
                    )
                FROM
                    clarisa_initiatives ci2
                    LEFT JOIN results_by_inititiative rbi2 ON rbi2.inititiative_id = ci2.id
                WHERE
                    r.id = rbi2.result_id
                    AND rbi2.initiative_role_id = 2
                    AND rbi2.is_active > 0
            ),
            'Not provided'
        ) AS "Contributing Initiative(s)",
        IFNULL(
            (
                SELECT
                    GROUP_CONCAT(
                        DISTINCT CONCAT(
                            '(Funder name: ',
                            ci4.acronym,
                            ' - ',
                            ci4.name,
                            ', Grant title: ',
                            npp.grant_title,
                            ', Center Grant ID: ',
                            IFNULL(npp.center_grant_id, 'Not applicable'),
                            ', Lead/Contract Center: ',
                            ci3.name,
                            ')'
                        ) SEPARATOR ', '
                    )
                FROM
                    non_pooled_project npp
                    LEFT JOIN clarisa_center cc ON cc.code = npp.lead_center_id
                    LEFT JOIN clarisa_institutions ci3 ON ci3.id = cc.institutionId
                    LEFT JOIN clarisa_institutions ci4 ON ci4.id = npp.funder_institution_id
                WHERE
                    npp.results_id = r.id
                    AND npp.is_active > 0
            ),
            'Not provided'
        ) AS "Non-pooled Project(s)",
        (
            SELECT
                GROUP_CONCAT(
                    DISTINCT CONCAT(
                        IF(rc.is_primary, '(Primary: ', '('),
                        ci5.acronym,
                        ' - ',
                        ci5.name,
                        ')'
                    ) SEPARATOR ', '
                )
            FROM
                results_center rc
                LEFT JOIN clarisa_center cc2 ON cc2.code = rc.center_id
                LEFT JOIN clarisa_institutions ci5 ON ci5.id = cc2.institutionId
            WHERE
                rc.result_id = r.id
                AND rc.is_active > 0
        ) AS "Contributing Center(s)",
        IF (
            r.result_level_id = 1
            OR r.result_level_id = 2,
            '<Not applicable>',
            (
                SELECT
                    GROUP_CONCAT(
                        '(',
                        ci9.official_code,
                        ' - ',
                        ci9.name,
                        ') ',
                        IFNULL(
                            (
                                SELECT
                                    CONCAT(wp.acronym, ' - ', wp.name)
                                FROM
                                    Integration_information.work_packages wp
                                WHERE
                                    wp.id = tr.work_packages_id
                            ),
                            ''
                        ),
                        '  Title: ',
                        tr.result_title,
                        ' - ',
                        IF(
                            tr.result_description IS NULL
                            OR tr.result_description = '',
                            '',
                            CONCAT(' Description: ', tr.result_description)
                        ) SEPARATOR ''
                    )
                FROM
                    Integration_information.toc_results tr
                    LEFT JOIN prdb.results_toc_result rtr ON rtr.results_id = r.id
                    AND rtr.is_active = 1
                    LEFT JOIN prdb.clarisa_initiatives ci9 ON ci9.id = rtr.initiative_id
                WHERE
                    tr.id = rtr.toc_result_id
            )
        ) AS "ToC Mapping (Primary submitter)",
        IFNULL (
            (
                SELECT
                    GROUP_CONCAT(
                        DISTINCT CONCAT(
                            '(',
                            ci6.official_code,
                            ' - ',
                            ci6.short_name,
                            '): ',
                            'Toc Level: ',
                            IFNULL(tl2.name, 'Not provider'),
                            ', ToC result title:',
                            IFNULL(tr2.title, 'Not provider')
                        ) SEPARATOR ', '
                    )
                FROM
                    results_toc_result rtr2
                    LEFT JOIN clarisa_initiatives ci6 ON ci6.id = rtr2.initiative_id
                    LEFT JOIN toc_result tr2 ON tr2.toc_result_id = rtr2.toc_result_id
                    LEFT JOIN toc_level tl2 ON tl2.toc_level_id = tr2.toc_level_id
                WHERE
                    rtr2.results_id = r.id
                    AND rtr2.initiative_id <> rbi.inititiative_id
                    AND rtr2.is_active > 0
            ),
            'Not provided'
        ) AS "ToC Mapping (Contributting initiatives)",
        -- PARTNERS & CONTRIBUTION
        IF(
            r.result_type_id <> 6,
            IF(r.no_applicable_partner = 1, "No", "Yes"),
            "Yes"
        ) AS "Are partners applicable?",
        IF(
            r.result_type_id <> 6,
            (
                SELECT
                    GROUP_CONCAT(DISTINCT CONCAT('• ', q1.partner) SEPARATOR ' ')
                FROM
                    (
                        SELECT
                            CONCAT(
                                CONCAT(
                                    IF(
                                        COALESCE(ci7.acronym, '') = '',
                                        '',
                                        CONCAT(ci7.acronym, ' - ')
                                    ),
                                    ci7.name
                                ),
                                '; Delivery type(s): ',
                                GROUP_CONCAT(DISTINCT pdt.name separator ', ')
                            ) AS partner
                        FROM
                            results_by_institution rbi
                            LEFT JOIN result_by_institutions_by_deliveries_type rbibdt ON rbibdt.result_by_institution_id = rbi.id
                            AND rbibdt.is_active > 0
                            LEFT JOIN clarisa_institutions ci7 ON ci7.id = rbi.institutions_id
                            LEFT JOIN partner_delivery_type pdt ON pdt.id = rbibdt.partner_delivery_type_id
                        WHERE
                            rbi.result_id = r.id
                            AND rbi.institution_roles_id = 2
                            AND rbi.is_active > 0
                        GROUP by
                            rbi.result_id,
                            ci7.id
                    ) AS q1
            ),
            'Not Applicable'
        ) AS "Partners (with delivery type) for non-KP results",
        IF(
            r.result_type_id = 6,
            (
                SELECT
                    group_concat(DISTINCT CONCAT('• ', q1.partner) separator ' ')
                FROM
                    (
                        SELECT
                            CONCAT(
                                'CGSpace Institution: ',
                                rkmi.intitution_name,
                                '; Mapped institution: ',
                                IF(
                                    rbi.id IS NULL,
                                    'None',
                                    CONCAT(
                                        CONCAT(
                                            IF(
                                                COALESCE(ci8.acronym, '') = '',
                                                '',
                                                CONCAT(ci8.acronym, ' - ')
                                            ),
                                            ci8.name
                                        ),
                                        '; Delivery type(s): ',
                                        GROUP_CONCAT(DISTINCT pdt.name separator ', ')
                                    )
                                )
                            ) AS partner
                        FROM
                            results_kp_mqap_institutions rkmi
                            LEFT JOIN results_knowledge_product rkp ON rkmi.result_knowledge_product_id = rkp.result_knowledge_product_id
                            AND rkp.is_active > 0
                            LEFT JOIN results_by_institution rbi ON rkmi.results_by_institutions_id = rbi.id
                            AND rbi.is_active > 0
                            AND rbi.institution_roles_id = 2
                            LEFT JOIN result_by_institutions_by_deliveries_type rbibdt ON rbibdt.result_by_institution_id = rbi.id
                            AND rbibdt.is_active > 0
                            LEFT JOIN clarisa_institutions ci8 ON ci8.id = rbi.institutions_id
                            LEFT JOIN partner_delivery_type pdt ON pdt.id = rbibdt.partner_delivery_type_id
                        WHERE
                            rkmi.is_active > 0
                            AND rkp.results_id = r.id
                        GROUP by
                            rkp.results_id,
                            rbi.institutions_id,
                            rkmi.intitution_name,
                            rkmi.results_by_institutions_id
                    ) AS q1
            ),
            'Not Applicable'
        ) AS "Partners (with delivery type) for KP results",
        IF(
            r.result_type_id = 6,
            IF(r.no_applicable_partner = 1, "No", "Yes"),
            'Not Applicable'
        ) AS "Are additional partners for KP results applicable?",
        IF(
            r.result_type_id = 6,
            (
                SELECT
                    GROUP_CONCAT(DISTINCT CONCAT('• ', q1.partner) SEPARATOR ' ')
                FROM
                    (
                        SELECT
                            CONCAT(
                                CONCAT(
                                    IF(
                                        COALESCE(ci7.acronym, '') = '',
                                        '',
                                        CONCAT(ci7.acronym, ' - ')
                                    ),
                                    ci7.name
                                ),
                                '; Delivery type(s): ',
                                group_concat(DISTINCT pdt.name separator ', ')
                            ) AS partner
                        FROM
                            results_by_institution rbi
                            LEFT JOIN result_by_institutions_by_deliveries_type rbibdt ON rbibdt.result_by_institution_id = rbi.id
                            AND rbibdt.is_active > 0
                            LEFT JOIN clarisa_institutions ci7 ON ci7.id = rbi.institutions_id
                            LEFT JOIN partner_delivery_type pdt ON pdt.id = rbibdt.partner_delivery_type_id
                        WHERE
                            rbi.result_id = r.id
                            AND rbi.institution_roles_id = 8
                            AND rbi.is_active > 0
                        GROUP by
                            rbi.result_id,
                            ci7.id
                    ) AS q1
            ),
            'Not Applicable'
        ) AS "Additional partners (with delivery type) for KP results",
        -- GEOGRAPHIC LOCATION
        (
            SELECT
                IF(
                    cgs.name is null,
                    'Not Provided',
                    (IF(cgs.id = 3, 'National', cgs.name))
                )
            FROM
                clarisa_geographic_scope cgs
            WHERE
                cgs.id = r.geographic_scope_id
            GROUP BY
                cgs.id,
                cgs.name
        ) AS "Geographic Focus",
        IFNULL(
            (
                SELECT
                    GROUP_CONCAT(DISTINCT cr.name separator ', ')
                FROM
                    result_region rr
                    LEFT JOIN clarisa_regions cr ON cr.um49Code = rr.region_id
                WHERE
                    rr.result_id = r.id
                    AND rr.is_active = 1
            ),
            'Not applicable / Not provided'
        ) AS "Regions",
        IFNULL(
            (
                SELECT
                    CASE
                        WHEN r.result_type_id <> 6 THEN 
                            CASE
                                WHEN r.geographic_scope_id = 5 THEN GROUP_CONCAT(csn.res SEPARATOR ' ')
                                ELSE GROUP_CONCAT(csn.countries SEPARATOR ', ')
                            END
                        ELSE MAX(rkp_inner.cgspace_countries)
                    END AS countries_val
                FROM
                    (
                        SELECT
                            cc3.name AS countries,
                            CONCAT_WS(
                                '',
                                cc3.name,
                                ': ',
                                IFNULL(
                                    GROUP_CONCAT(css.name SEPARATOR ', '),
                                    IF(
                                        (
                                            SELECT COUNT(css2.id)
                                            FROM clarisa_subnational_scopes css2
                                            WHERE css2.country_iso_alpha_2 = cc3.iso_alpha_2
                                        ) > 0,
                                        'Not provided',
                                        'No sub-national levels available'
                                    )
                                )
                            ) AS res
                        FROM result_country rc2
                        LEFT JOIN clarisa_countries cc3 ON cc3.id = rc2.country_id
                        LEFT JOIN result_country_subnational rcs ON rcs.result_country_id = rc2.result_country_id
                            AND rcs.is_active = 1
                        LEFT JOIN clarisa_subnational_scopes css ON css.code = rcs.clarisa_subnational_scope_code
                        WHERE rc2.result_id = r.id
                          AND rc2.is_active = 1
                        GROUP BY cc3.name, cc3.iso_alpha_2
                    ) csn
                LEFT JOIN results_knowledge_product rkp_inner ON rkp_inner.results_id = r.id
                    AND rkp_inner.is_active > 0
                GROUP BY r.id
            ),
            'Not applicable'
        ) AS "Countries",
        -- LINKS TO RESULTS
        IFNULL(
            (
                SELECT
                    GROUP_CONCAT(
                        DISTINCT CONCAT(
                            '(',
                            r2.result_code,
                            ': ',
                            rt2.name,
                            ' - ',
                            r2.title,
                            ')'
                        ) SEPARATOR ', '
                    )
                FROM
                    linked_result lr
                    JOIN result r2 ON r2.id = lr.linked_results_id
                    AND r2.is_active > 0
                    LEFT JOIN result_type rt2 ON rt2.id = r2.result_type_id
                WHERE
                    lr.origin_result_id = r.id
                    AND lr.linked_results_id IS NOT NULL
                    AND lr.is_active > 0
            ),
            'Not provided'
        ) AS "Linked Results",
        IFNULL(
            (
                SELECT
                    GROUP_CONCAT(
                        DISTINCT lr2.legacy_link SEPARATOR ' '
                    )
                FROM
                    linked_result lr2
                WHERE
                    lr2.origin_result_id = r.id
                    AND lr2.linked_results_id IS NULL
                    AND lr2.is_active > 0
                    AND lr2.legacy_link IS NOT NULL
            ),
            'Not provided'
        ) AS "Results from previous portfolio",
        -- EVIDENCE
        (
            SELECT
                GROUP_CONCAT(
                    DISTINCT CONCAT(
                        '• Link: ',
                        COALESCE(e.link, 'Not Provided'),
                        '; Gender related? ',
                        IF(COALESCE(e.gender_related, 0) = 1, 'Yes', 'No'),
                        '; Youth related? ',
                        IF(COALESCE(e.youth_related, 0) = 1, 'Yes', 'No'),
                        '; Nutrition related? ',
                        IF(
                            COALESCE(e.nutrition_related, 0) = 1,
                            'Yes',
                            'No'
                        ),
                        '; Environment and/or biodiversity related? ',
                        IF(
                            COALESCE(e.environmental_biodiversity_related, 0) = 1,
                            'Yes',
                            'No'
                        ),
                        '; Poverty related? ',
                        IF(COALESCE(e.poverty_related, 0) = 1, 'Yes', 'No'),
                        '; Details: ',
                        COALESCE(e.description, 'Not Provided')
                    ) SEPARATOR ''
                )
            FROM
                evidence e
            WHERE
                e.result_id = r.id
                AND e.is_active > 0
        ) AS "Evidences"
    FROM
        result r
        LEFT JOIN results_by_inititiative rbi ON r.id = rbi.result_id
        AND rbi.initiative_role_id = 1
        AND rbi.is_active > 0
        LEFT JOIN gender_tag_level gtl ON gtl.id = r.gender_tag_level_id
        LEFT JOIN gender_tag_level gtl2 ON gtl2.id = r.climate_change_tag_level_id
        LEFT JOIN gender_tag_level gtl3 ON gtl3.id = r.nutrition_tag_level_id
        LEFT JOIN gender_tag_level gtl4 ON gtl4.id = r.environmental_biodiversity_tag_level_id
        LEFT JOIN gender_tag_level gtl5 ON gtl5.id = r.poverty_tag_level_id
    ${whereClause}
    `;

    try {
      const results = await this.query(query, ['?']);
      return results;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getBasicResultDataForReport(resultIdsArray: number[]) {
    return this._getBasicResultDataForReportByParameters({
      resultIds: resultIdsArray,
    });
  }

  async getBasicResultDataForReportByInitiative(
    initiativeId: number,
    phase?: number,
  ) {
    return this._getBasicResultDataForReportByParameters({
      initiativeIds: [initiativeId],
      phases: phase ? [phase] : null,
    });
  }

  private async _getTocDataForReportByParameters(
    parameters: ReportParametersDto,
  ) {
    let whereClause = '';
    if (parameters.resultIds) {
      whereClause = `WHERE r.id ${
        parameters.resultIds.length
          ? `in (${parameters.resultIds.join(',')})`
          : '= 0'
      } and rtr.is_active`;
    }

    if (parameters.initiativeIds) {
      whereClause = `${
        whereClause.length ? 'AND' : 'WHERE'
      } rbi.inititiative_id in (${parameters.initiativeIds.join(
        ',',
      )}) AND r.status_id = 3 ${
        parameters.phases
          ? `and r.version_id in (${parameters.phases.join(',')})`
          : ''
      }`;
    }

    const query = `
    SELECT 
      r.id as "Result ID",
      r.result_code as "Result Code",
      (
        SELECT GROUP_CONCAT(DISTINCT concat('• ', caa.name) separator '\n')
        from result_toc_action_area rtaa
        LEFT JOIN clarisa_action_area_outcome caao ON caao.id = rtaa.action_area_outcome
        left join clarisa_action_area caa on caao.actionAreaId = caa.id
        WHERE rtaa.result_toc_result_id = rtr.result_toc_result_id AND rtaa.is_active = 1
        order by caa.id
      ) as "Action Area(s)",
      (
        SELECT GROUP_CONCAT(DISTINCT concat('• ', cia.name) separator '\n')
        from result_toc_impact_area_target rtia
        LEFT JOIN clarisa_global_targets cgt ON cgt.targetId = rtia.impact_area_indicator_id
        LEFT JOIN clarisa_impact_areas cia ON cia.id = cgt.impactAreaId
        WHERE rtia.result_toc_result_id = rtr.result_toc_result_id AND rtia.is_active = 1
      ) as "Impact Area(s)",
      (
        SELECT GROUP_CONCAT(DISTINCT concat('• ', cgt.target) separator '\n')
        from result_toc_impact_area_target rtia
        LEFT JOIN clarisa_global_targets cgt ON cgt.targetId = rtia.impact_area_indicator_id
        WHERE rtia.result_toc_result_id = rtr.result_toc_result_id AND rtia.is_active = 1
      ) as "Impact Area Target(s)",
      (
        SELECT GROUP_CONCAT(DISTINCT concat('• ', cst.sdg_target_code, ' - ', cst.sdg_target) separator '\n')
        FROM result_toc_sdg_targets rtsdgt
        LEFT JOIN clarisa_sdgs cs ON cs.usnd_code = rtsdgt.clarisa_sdg_usnd_code
        LEFT JOIN clarisa_sdgs_targets cst ON cst.id = rtsdgt.clarisa_sdg_target_id
        WHERE rtsdgt.result_toc_result_id = rtr.result_toc_result_id AND rtsdgt.is_active = 1
        order by cst.sdg_target_code
      ) as "SDG Target(s)",
      (
        SELECT GROUP_CONCAT(DISTINCT concat('• ', cs.short_name) separator '\n')
        FROM result_toc_sdg_targets rtsdgt
        LEFT JOIN clarisa_sdgs cs ON cs.usnd_code = rtsdgt.clarisa_sdg_usnd_code
        WHERE rtsdgt.result_toc_result_id = rtr.result_toc_result_id AND rtsdgt.is_active = 1
        order by cs.usnd_code
      ) as "SDG(s)"
    from result r
    LEFT JOIN prdb.results_toc_result rtr ON rtr.results_id = r.id
    ${
      parameters.initiativeIds
        ? 'left join results_by_inititiative rbi on rbi.result_id = r.id'
        : ''
    }
    ${whereClause}
    ;
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

  async getTocDataForReport(resultIdsArray: number[]) {
    return this._getTocDataForReportByParameters({
      resultIds: resultIdsArray,
    });
  }

  async getTocDataForReportByInitiative(initiativeId: number, phase?: number) {
    return this._getTocDataForReportByParameters({
      initiativeIds: [initiativeId],
      phases: phase ? [phase] : null,
    });
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

  async getResultsByInitiativeId(resultId: number) {
    const innovationQuery = `
    SELECT
        r.id AS result_id,
        r.result_code,
        r.title,
        r.description,
        rbi.inititiative_id AS initiative_id,
        r.geographic_scope_id,
        r.gender_tag_level_id,
        r.climate_change_tag_level_id,
        r.result_level_id,
        r.result_type_id,
        r.reported_year_id,
        r.is_krs,
        r.krs_url
    FROM
        result r
        LEFT JOIN results_by_inititiative rbi ON rbi.result_id = r.id
        LEFT JOIN clarisa_geographic_scope cgs ON cgs.id = r.geographic_scope_id
    WHERE
        r.status_id = 3
        AND r.is_active = 1
        AND rbi.initiative_role_id = 1
        AND (
            r.result_type_id = 2
            OR r.result_type_id = 7
        )
        AND r.id = ?;
    `;

    try {
      const result = await this.query(innovationQuery, [resultId]);
      return result;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultAgainstToc(resultIdsArray: number[]) {
    const resultIds = (resultIdsArray ?? []).join(',');
    const query = `
    SELECT
        r.result_code AS 'Result Code',
        r.title AS 'Title',
        (
            SELECT
                ci.official_code
            FROM
                clarisa_initiatives ci
            WHERE
                ci.id = rbi.inititiative_id
        ) AS 'Primary / Contributing initiative official code',
        (
            SELECT
                ci.name
            FROM
                clarisa_initiatives ci
            WHERE
                ci.id = rbi.inititiative_id
        ) AS 'Primary / Contributing initiative name',
        CONCAT(wp.acronym, ' - ', tr.result_title) AS 'ToC element',
        tri.indicator_description AS 'Description',
        DATE(tri.target_date) AS 'Target date',
        tri.unit_messurament AS 'Unit of measure',
        tri.target_value AS 'Target value',
        IFNULL(rtri.indicator_contributing, 'Not provided') AS 'Target contribution from the result',
        IFNULL(rtr.toc_progressive_narrative, 'Not aplicable') AS 'ToC progressive narrative'
    FROM
        result r
        LEFT JOIN results_toc_result rtr ON rtr.results_id = r.id
        LEFT JOIN results_by_inititiative rbi ON rbi.result_id = r.id
        LEFT JOIN results_toc_result_indicators rtri ON rtri.results_toc_results_id = rtr.result_toc_result_id
        LEFT JOIN Integration_information.toc_results tr ON tr.id = rtr.toc_result_id
        LEFT JOIN Integration_information.work_packages wp ON wp.id = tr.work_packages_id
        LEFT JOIN Integration_information.toc_results_indicators tri ON tr.id = tri.toc_results_id AND tri.toc_result_indicator_id = rtri.toc_results_indicator_id ${
          !EnvironmentExtractor.isProduction()
            ? `COLLATE utf8mb3_general_ci`
            : ``
        }
    WHERE
        r.id ${resultIds.length ? `in (${resultIds})` : '= 0'}
        AND rbi.is_active = 1
        AND rtr.is_active = 1
        AND rtr.planned_result = 1
        AND rtri.is_active > 0
        AND rbi.inititiative_id = rtr.initiative_id
        AND tr.phase = (
              select
                  v.toc_pahse_id
              from
                  version v
              where
                  r.version_id = v.id
          );
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

  async getIndicatorContributionSummaryByProgram(initiativeId: number) {
    const query = `
      SELECT
        r.result_type_id,
        rt.name AS result_type_name,
        r.status_id,
        COUNT(DISTINCT r.id) AS total_results
      FROM result r
      INNER JOIN results_by_inititiative rbi
        ON rbi.result_id = r.id
        AND rbi.inititiative_id = ?
        AND rbi.is_active = 1
      INNER JOIN \`version\` v
        ON v.id = r.version_id
        AND v.is_active = 1
        AND v.status = 1
        AND v.app_module_id = 1
      INNER JOIN result_type rt
        ON rt.id = r.result_type_id
      WHERE
        r.is_active = 1
        AND r.status_id IN (1, 2, 3)
        AND r.result_level_id IN (3, 4)
        AND r.result_type_id IN (1, 2, 4, 5, 6, 7, 8, 10)
      GROUP BY
        r.result_type_id,
        rt.name,
        r.status_id
      ORDER BY
        rt.name ASC,
        r.status_id ASC;
    `;

    try {
      return await this.query(query, [initiativeId]);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRepository.name,
        error,
        debug: true,
      });
    }
  }

  async getActiveResultTypes() {
    const query = `
      SELECT
        rt.id,
        rt.name
      FROM result_type rt
      WHERE rt.is_active = 1
        AND rt.id IN (1, 2, 4, 5, 6, 7, 8, 10)
      ORDER BY rt.name ASC;
    `;

    try {
      return await this.query(query);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRepository.name,
        error,
        debug: true,
      });
    }
  }

  async getResultsForInnovUse() {
    const query = `
    SELECT 
      r.id,
      cp.acronym,
      v.phase_year,
      r.result_code,
      rt.name,
      r.title
    FROM result r
    INNER JOIN result_type rt ON r.result_type_id = rt.id
      AND rt.is_active = true
    INNER JOIN version v ON r.version_id = v.id
      AND v.is_active = true
    INNER JOIN clarisa_portfolios cp ON v.portfolio_id = cp.id
    WHERE         
      r.version_id = 34
        AND r.is_active = true
    UNION ALL
    SELECT 
      r.id,
      cp.acronym,
      v.phase_year,
      r.result_code,
      rt.name,
      r.title
    FROM result r
    INNER JOIN result_type rt ON r.result_type_id = rt.id
      AND rt.is_active = true
    INNER JOIN version v ON r.version_id = v.id
      AND v.is_active = true
    INNER JOIN clarisa_portfolios cp ON v.portfolio_id = cp.id
    WHERE         
      cp.id = 2
        AND r.result_type_id IN (2, 7)
        AND r.is_active = true;
    `;

    try {
      return await this.query(query);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRepository.name,
        error,
        debug: true,
      });
    }
  }

  async getResultInnovationDevelopmentByResultId(
    resultId: number,
  ): Promise<boolean> {
    return await this.createQueryBuilder('r')
      .innerJoin(
        'result_answers',
        'ra',
        'ra.result_id = r.id AND ra.is_active = true',
      )
      .innerJoin(
        'result_questions',
        'rq',
        'rq.result_question_id = ra.result_question_id',
      )
      .where('rq.result_question_id = :questionId', { questionId: 110 }) // Id related to: "Yes, please contact me"
      .andWhere('r.is_active = true')
      .andWhere('r.id = :resultId', { resultId })
      .getExists();
  }
}
