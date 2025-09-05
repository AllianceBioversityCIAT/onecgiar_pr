import { Injectable } from '@nestjs/common';

import { DataSource } from 'typeorm';
import { Ipsr } from './entities/ipsr.entity';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ResultCountriesSubNational } from '../results/result-countries-sub-national/entities/result-countries-sub-national.entity';
import { LogicalDelete } from '../../shared/globalInterfaces/delete.interface';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../shared/globalInterfaces/replicable.interface';
import { predeterminedDateValidation } from '../../shared/utils/versioning.utils';
import { BaseRepository } from '../../shared/extendsGlobalDTO/base-repository';
import { env } from 'process';
import { ExcelReportDto } from './dto/excel-report-ipsr.dto';

@Injectable()
export class IpsrRepository
  extends BaseRepository<Ipsr>
  implements LogicalDelete<Ipsr>
{
  createQueries(
    config: ReplicableConfigInterface<Ipsr>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      SELECT
          is_active,
          ${predeterminedDateValidation(
            config.predetermined_date,
          )} AS created_date,
          last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          result_by_innovation_package_id,
          result_innovation_package_id,
          result_id,
          ipsr_role_id,
          readinees_evidence_link,
          use_evidence_link,
          readiness_level_evidence_based,
          use_details_of_evidence,
          readiness_details_of_evidence,
          use_level_evidence_based,
          current_innovation_readiness_level,
          current_innovation_use_level,
          potential_innovation_readiness_level,
          potential_innovation_use_level
      FROM
          result_by_innovation_package
      WHERE
          result_innovation_package_id = ${config.old_result_id}
          AND is_active > 0;`,
      insertQuery: `
      INSERT INTO
          result_by_innovation_package (
              is_active,
              created_date,
              last_updated_date,
              created_by,
              last_updated_by,
              result_innovation_package_id,
              result_id,
              ipsr_role_id,
              readinees_evidence_link,
              use_evidence_link,
              readiness_level_evidence_based,
              use_details_of_evidence,
              readiness_details_of_evidence,
              use_level_evidence_based,
              current_innovation_readiness_level,
              current_innovation_use_level,
              potential_innovation_readiness_level,
              potential_innovation_use_level
          )
      SELECT
          is_active,
          ${predeterminedDateValidation(
            config.predetermined_date,
          )} AS created_date,
          last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          ${config.new_result_id} AS result_innovation_package_id,
          result_id,
          ipsr_role_id,
          readinees_evidence_link,
          use_evidence_link,
          readiness_level_evidence_based,
          use_details_of_evidence,
          readiness_details_of_evidence,
          use_level_evidence_based,
          current_innovation_readiness_level,
          current_innovation_use_level,
          potential_innovation_readiness_level,
          potential_innovation_use_level
      FROM
          result_by_innovation_package
      WHERE
          result_innovation_package_id = ${config.old_result_id}
          AND is_active > 0;
      `,
      returnQuery: `
      SELECT
        result_by_innovation_package_id
      FROM
        result_by_innovation_package r1
      WHERE
          r1.result_innovation_package_id = ${config.new_result_id}
          AND r1.is_active > 0
          AND r1.ipsr_role_id = 1`,
    };
  }

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(Ipsr, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete rbip from result_by_innovation_package rbip where rbip.result_innovation_package_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: IpsrRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<Ipsr> {
    const dataQuery = `update result_by_innovation_package rbip set rbip.is_active = 0 where rbip.result_innovation_package_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: IpsrRepository.name,
          debug: true,
        }),
      );
  }

  async getResultsInnovation(initiativeId: number[]) {
    const resultInnovationQuery = `
        SELECT
            DISTINCT r.id AS result_id,
            r.result_code,
            r.title,
            r.description,
            r.result_type_id,
            r.result_level_id,
            rbi.inititiative_id AS initiative_id,
            r.version_id,
            IF(
                (rbi.initiative_role_id = 2),
                (
                    SELECT
                        ci2.official_code
                    FROM
                        clarisa_initiatives ci2
                        LEFT JOIN results_by_inititiative rbi2 ON rbi2.inititiative_id = ci2.id
                    WHERE
                        rbi2.initiative_role_id = 1
                        AND rbi2.result_id = r.id
                ),
                (
                    SELECT
                        ci.official_code
                    FROM
                        clarisa_initiatives ci
                    WHERE
                        ci.id = rbi.inititiative_id
                )
            ) AS official_code,
            r.created_date AS creation_date,
            (
                SELECT
                    rt.name
                FROM
                    result_type rt
                WHERE
                    rt.id = r.result_type_id
            ) AS innovation_type,
            rbi.initiative_role_id
        FROM
            result r
            LEFT JOIN results_by_inititiative rbi ON rbi.result_id = r.id
        WHERE
            r.status_id = 2
            AND r.is_active = 1
            AND rbi.inititiative_id IN (?)
            AND (
                rbi.initiative_role_id = 1
                OR rbi.initiative_role_id = 2
            )
            AND r.result_type_id = 7
        ORDER BY
            r.created_date ASC;
        `;

    try {
      const resultInnovation: any[] = await this.dataSource.query(
        resultInnovationQuery,
        [initiativeId],
      );
      return resultInnovation;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: IpsrRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultInnovationDetail(resultId: number) {
    const resultInnovationByIdQuery = `
        SELECT
            r.id AS result_id,
            r.result_code,
            r.title,
            r.status,
            r.status_id,
            r.in_qa as inQA,
            rs.status_name,
            rbi.inititiative_id,
            ci.official_code AS initiative_official_code,
            ci.short_name AS initiative_short_name,
            ci.name AS initiative_name,
            r.version_id,
            (
                SELECT
                    rl.name
                FROM
                    result_level rl
                WHERE
                    rl.id = r.result_level_id
            ) AS result_level,
            (
                SELECT
                    rt.name
                FROM
                    result_type rt
                WHERE
                    rt.id = r.result_type_id
            ) AS result_type,
            v.status as is_phase_open,
            r.is_replicated,
            r.is_discontinued,
            v.phase_name,
            v.phase_year
        FROM
            result r
            LEFT JOIN results_by_inititiative rbi ON rbi.result_id = r.id
            LEFT JOIN clarisa_initiatives ci ON ci.id = rbi.inititiative_id
            INNER JOIN result_status rs ON rs.result_status_id = r.status_id
            inner join \`version\` v on v.id = r.version_id
        WHERE
            r.is_active = 1
            AND r.id = ?;
        `;

    try {
      const resultInnovation: any[] = await this.dataSource.query(
        resultInnovationByIdQuery,
        [resultId],
      );

      return resultInnovation[0];
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: IpsrRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultInnovationById(resultId: number) {
    const resultInnovationByIdQuery = `
        SELECT
            r.id AS result_id,
            r.result_code,
            r.title,
            r.description,
            rbi.inititiative_id AS initiative_id,
            (
                SELECT
                    ci.official_code
                FROM
                    clarisa_initiatives ci
                WHERE
                    ci.id = rbi.inititiative_id
            ) AS official_code,
            r.created_date AS creation_date,
            (
                SELECT
                    rt.name
                FROM
                    result_type rt
                WHERE
                    rt.id = r.result_type_id
            ) AS innovation_type,
            r.result_type_id,
            r.geographic_scope_id,
            cgs.name AS geoscope,
            r.gender_tag_level_id,
            (
                SELECT
                    gtl.title
                FROM
                    gender_tag_level gtl
                WHERE
                    gtl.id = r.gender_tag_level_id
            ) AS gender_tag_level,
            (
                SELECT
                    e1.link
                FROM
                    evidence e1
                WHERE
                    e1.result_id = r.id
                    AND e1.gender_related = TRUE
                    AND e1.is_active = 1
                    LIMIT 1
            ) AS evidence_gender_tag,
            r.climate_change_tag_level_id,
            (
                SELECT
                    gtl2.title
                FROM
                    gender_tag_level gtl2
                WHERE
                    gtl2.id = r.climate_change_tag_level_id
            ) AS climate_tag_level,
            (
                SELECT
                    e2.link
                FROM
                    evidence e2
                WHERE
                    e2.result_id = r.id
                    AND e2.youth_related = TRUE
                    AND e2.is_active = 1
                    LIMIT 1
            ) AS evidence_climate_tag,
            r.nutrition_tag_level_id,
            (
                SELECT
                    gtl3.title
                FROM
                    gender_tag_level gtl3
                WHERE
                    gtl3.id = r.nutrition_tag_level_id
            ) AS nutrition_tag_level,
            (
                SELECT
                    e3.link
                FROM
                    evidence e3
                WHERE
                    e3.result_id = r.id
                    AND e3.nutrition_related = TRUE
                    AND e3.is_active = 1
                    LIMIT 1
            ) AS evidence_nutrition_tag,
            r.environmental_biodiversity_tag_level_id,
            (
                SELECT
                    gtl4.title
                FROM
                    gender_tag_level gtl4
                WHERE
                    gtl4.id = r.environmental_biodiversity_tag_level_id
            ) AS environmental_biodiversity_tag_level,
            (
                SELECT
                    e4.link
                FROM
                    evidence e4
                WHERE
                    e4.result_id = r.id
                    AND e4.environmental_biodiversity_related = TRUE
                    AND e4.is_active = 1
                    LIMIT 1
            ) AS evidence_environment_tag,
            r.poverty_tag_level_id,
            (
                SELECT
                    gtl5.title
                FROM
                    gender_tag_level gtl5
                WHERE
                    gtl5.id = r.poverty_tag_level_id
            ) AS poverty_tag_level,
            (
                SELECT
                    e5.link
                FROM
                    evidence e5
                WHERE
                    e5.result_id = r.id
                    AND e5.poverty_related = TRUE
                    AND e5.is_active = 1
                    LIMIT 1
            ) AS evidence_poverty_tag,
            IF((r.is_krs = 1), true, false ) AS is_krs,
            r.krs_url,
            r.lead_contact_person,
            r.lead_contact_person_id,
            r.reported_year_id,
            r.is_replicated,
            r.is_discontinued
        FROM
            result r
            LEFT JOIN results_by_inititiative rbi ON rbi.result_id = r.id
            LEFT JOIN clarisa_geographic_scope cgs ON cgs.id = r.geographic_scope_id
        WHERE r.is_active = 1
            AND r.id = ?
            AND rbi.initiative_role_id = 1;
        `;

    const countryQuery = `
        SELECT
            rc.result_country_id,
            rc.country_id AS id,
            cc.name,
            rc.result_id,
            cc.iso_alpha_2
        FROM result_country rc
            LEFT JOIN clarisa_countries cc ON cc.id = rc.country_id
        WHERE rc.result_id = ?
            AND rc.is_active = 1;
        `;

    const subNationalQuery = `
        SELECT
        	*
        from
        	result_countries_sub_national rcsn
        WHERE
        	rcsn.result_countries_id in (
        	SELECT
        		rc.result_country_id
        	FROM
        		result_country rc
        	WHERE
        		rc.result_id = ?
        		AND rc.is_active = 1)
        and rcsn.is_active = true;
        `;

    const regionsQuery = `
        SELECT
            rr.result_region_id,
            rr.region_id AS id,
            cr.name,
            rr.result_id
        FROM result_region rr
            LEFT JOIN clarisa_regions cr ON cr.um49Code = rr.region_id
        WHERE rr.result_id = ?
            AND rr.is_active = 1;
        `;

    try {
      const resultInnovation: any[] = await this.dataSource.query(
        resultInnovationByIdQuery,
        [resultId],
      );
      const regions: any[] = await this.dataSource.query(regionsQuery, [
        resultId,
      ]);
      const countries: any[] = await this.dataSource.query(countryQuery, [
        resultId,
      ]);
      const sub_national: ResultCountriesSubNational[] =
        await this.dataSource.query(subNationalQuery, [resultId]);

      if (resultInnovation[0]?.lead_contact_person_id) {
        const leadContactQuery = `
        SELECT id, mail, displayName, givenName, surname
        FROM ad_users
        WHERE id = ? AND is_active = 1
      `;

        try {
          const leadContactData = await this.dataSource.query(
            leadContactQuery,
            [resultInnovation[0].lead_contact_person_id],
          );

          if (leadContactData.length > 0) {
            resultInnovation[0].lead_contact_person_data = leadContactData[0];
          }
        } catch (error) {
          console.warn('Failed to get lead contact person data:', error);
        }
      }

      resultInnovation.map((ri) => {
        ri['hasRegions'] = regions.filter((r) => {
          return r.result_id === ri.result_id;
        });

        ri['hasCountries'] = countries
          .filter((c) => {
            return c.result_id === ri.result_id;
          })
          .map((cid) => {
            cid['result_countries_sub_national'] = sub_national.filter(
              (el) => el.result_countries_id == cid['result_country_id'],
            );
            return cid;
          });
      });

      return [resultInnovation[0]];
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: IpsrRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAllInnovationPackages() {
    const innovationPackagesQuery = `
        SELECT
            DISTINCT r.id,
            r.result_code,
            r.title,
            r.reported_year_id AS reported_year,
            rt.name AS result_type,
            rl.name AS result_level_name,
            rt.id AS result_type_id,
            r.created_date,
            (
                SELECT
                    ci.official_code
                FROM
                    clarisa_initiatives ci
                WHERE
                    ci.id = rbi.inititiative_id
            ) AS official_code,
            ci.id AS submitter_id,
            rbi.inititiative_id AS initiative_id,
            rs.status_name AS status,
            r.reported_year_id,
            if(y.\`year\` = r.reported_year_id, 'New', '') as is_new,
            v.phase_year,
            r.result_level_id,
            r.no_applicable_partner,
            if(r.geographic_scope_id in (3, 4), 3, r.geographic_scope_id ) as geographic_scope_id,
            r.legacy_id,
            (
                SELECT
                    CONCAT(
                        u.first_name,
                        ' ',
                        u.last_name
                    )
                FROM
                    users u
                WHERE
                    u.id = r.created_by
            ) AS created_by,
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
            LEFT JOIN results_by_inititiative rbi ON rbi.result_id = r.id
            LEFT JOIN result_by_innovation_package ibr ON ibr.result_innovation_package_id = r.id
            LEFT JOIN result_type rt ON rt.id = r.result_type_id
            INNER JOIN result_status rs ON rs.result_status_id = r.status_id
            LEFT JOIN users u on u.id = r.created_by
            INNER JOIN version v ON v.id = r.version_id
            INNER JOIN result_level rl on rl.id = r.result_level_id
            INNER JOIN clarisa_initiatives ci ON ci.id = rbi.inititiative_id
            LEFT JOIN clarisa_portfolios cp ON ci.portfolio_id = cp.id
            LEFT JOIN \`year\` y ON y.active > 0
        WHERE
            r.is_active = 1
            AND r.id = ibr.result_innovation_package_id
            AND rbi.is_active = 1
            AND rbi.initiative_role_id = 1
        ORDER BY
            r.result_code ASC;
        `;

    try {
      const getAllInnovationPackages: any[] = await this.dataSource.query(
        innovationPackagesQuery,
      );
      return getAllInnovationPackages;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: IpsrRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAllInnovationPackagesFiltered(
    filters?: {
      initiativeCode?: string;
      versionId?: number | number[];
      submitterId?: number | number[];
      resultTypeId?: number | number[];
      portfolioId?: number | number[];
      statusId?: number | number[];
    },
    pagination?: { limit?: number; offset?: number },
  ) {
    const baseQuery = `
        SELECT
            DISTINCT r.id,
            r.result_code,
            r.title,
            r.reported_year_id AS reported_year,
            rt.name AS result_type,
            rl.name AS result_level_name,
            rt.id AS result_type_id,
            r.created_date,
            (
                SELECT ci2.official_code FROM clarisa_initiatives ci2 WHERE ci2.id = rbi.inititiative_id
            ) AS official_code,
            ci.id AS submitter_id,
            rbi.inititiative_id AS initiative_id,
            rs.status_name AS status,
            r.reported_year_id,
            if(y.\`year\` = r.reported_year_id, 'New', '') as is_new,
            v.phase_year,
            r.result_level_id,
            r.no_applicable_partner,
            if(r.geographic_scope_id in (3, 4), 3, r.geographic_scope_id ) as geographic_scope_id,
            r.legacy_id,
            (
                SELECT CONCAT(u.first_name, ' ', u.last_name) FROM users u WHERE u.id = r.created_by
            ) AS created_by,
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
            LEFT JOIN results_by_inititiative rbi ON rbi.result_id = r.id
            LEFT JOIN result_by_innovation_package ibr ON ibr.result_innovation_package_id = r.id
            LEFT JOIN result_type rt ON rt.id = r.result_type_id
            INNER JOIN result_status rs ON rs.result_status_id = r.status_id
            LEFT JOIN users u on u.id = r.created_by
            INNER JOIN version v ON v.id = r.version_id
            INNER JOIN result_level rl on rl.id = r.result_level_id
            INNER JOIN clarisa_initiatives ci ON ci.id = rbi.inititiative_id
            LEFT JOIN clarisa_portfolios cp ON ci.portfolio_id = cp.id
            LEFT JOIN \`year\` y ON y.active > 0
        WHERE
            r.is_active = 1
            AND r.id = ibr.result_innovation_package_id
            AND rbi.is_active = 1
            AND rbi.initiative_role_id = 1`;

    const params: (string | number)[] = [];
    const where: string[] = [];

    const addFilter = (clause: string, values: (number | string)[]) => {
      where.push(clause);
      params.push(...values);
    };

    const addIn = (field: string, values?: number | number[]) => {
      if (values === undefined || values === null) return;
      const arr = Array.isArray(values) ? values : [values];
      if (!arr.length) return;
      const placeholders = arr.map(() => '?').join(',');
      where.push(`AND ${field} IN (${placeholders})`);
      params.push(...arr);
    };

    try {
      if (filters?.initiativeCode) {
        addFilter('AND ci.official_code = ?', [filters.initiativeCode]);
      }
      addIn('r.version_id', filters?.versionId);
      addIn('ci.id', filters?.submitterId);
      addIn('rt.id', filters?.resultTypeId);
      addIn('ci.portfolio_id', filters?.portfolioId);
      addIn('r.status_id', filters?.statusId);

      const limit = pagination?.limit && pagination.limit > 0 ? pagination.limit : undefined;
      const offset =
        limit !== undefined && pagination?.offset !== undefined && pagination.offset >= 0
          ? pagination.offset
          : undefined;

      const orderClause = ` ORDER BY r.result_code ASC`;
      const paginatedClause =
        limit !== undefined
          ? ` LIMIT ${limit}${offset !== undefined ? ` OFFSET ${offset}` : ''}`
          : '';

      const queryData = `${baseQuery} ${where.join(' ')}${orderClause}${paginatedClause};`;
      const results = await this.query(queryData, params);

      if (limit !== undefined) {
        const countQuery = `SELECT COUNT(1) as total FROM (${baseQuery} ${where.join(' ')}) as sub`;
        const totalRows = await this.query(countQuery, params);
        const total = totalRows?.[0]?.total ?? 0;
        return { results, total };
      }

      return { results, total: results.length };
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: IpsrRepository.name,
        error,
        debug: true,
      });
    }
  }

  async getStepTwoOne(resultId: number) {
    const query = `
        SELECT
            rbip.result_by_innovation_package_id,
        	rbip.result_id,
        	r.result_code,
        	r.title,
        	r.description,
        	r.result_type_id,
            r.version_id,
        	rbi.inititiative_id as initiative_id,
        	ci.official_code as initiative_official_code,
            rbi.is_active
        FROM
        	result_by_innovation_package rbip
        inner join \`result\` r on
        	r.id = rbip.result_id
        	and r.is_active = true
        left join results_by_inititiative rbi on
        	rbi.result_id = r.id
        	and rbi.initiative_role_id = 1
        	and rbi.is_active = true
        left join clarisa_initiatives ci on
        	ci.id = rbi.inititiative_id
        where
        	rbip.result_innovation_package_id = ?
            and rbip.ipsr_role_id = 2
        	and rbip.is_active = true;
        `;
    try {
      const results: GetInnovationComInterface[] = await this.query(query, [
        resultId,
      ]);
      return results;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: IpsrRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getInnovationCoreStepOne(resultId: number) {
    const innovationByIdQuery = `
        SELECT
            rbip.result_id
        FROM
            result_by_innovation_package rbip
        WHERE
          rbip.result_innovation_package_id = ?;
        `;

    const coreInnovationQuery = `
        SELECT
            r.result_code,
            r.title,
            (
                SELECT
                    ci.official_code
                FROM
                    clarisa_initiatives ci
                WHERE ci.id = rbi.inititiative_id
            ) AS official_code,
            r.version_id
        FROM
            result r
            LEFT JOIN results_by_inititiative rbi ON rbi.result_id = r.id
        WHERE r.is_active = 1
            AND rbi.initiative_role_id = 1
            AND r.id = ?;
        `;

    try {
      const innovationById: any[] = await this.dataSource.query(
        innovationByIdQuery,
        [resultId],
      );
      const coreId: number = innovationById[0].result_id;
      const coreInnovation: any[] = await this.dataSource.query(
        coreInnovationQuery,
        [coreId],
      );
      return coreInnovation[0];
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: IpsrRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getIpsrList(excelReportDto: ExcelReportDto) {
    const { inits, phases, searchText } = excelReportDto;
    const initIds = inits.map((init) => {
      return init.id;
    });
    const phaseIds = phases.map((phase) => {
      return phase.id;
    });

    const initClause =
      initIds.length > 0
        ? `AND r.id IN (
           SELECT result_id
           FROM results_by_inititiative
           WHERE inititiative_id IN (${initIds.join(',')})
             AND initiative_role_id = 1
             AND is_active > 0
         )`
        : '';

    const phaseClause =
      phaseIds.length > 0 ? `AND r.version_id IN (${phaseIds.join(',')})` : '';

    const searchClause = searchText
      ? `AND (
            r.result_code LIKE '%${searchText}%'
            OR r.title LIKE '%${searchText}%'
            OR ci.official_code LIKE '%${searchText}%'
            OR rs.status_name LIKE '%${searchText}%'
            OR v.phase_year LIKE '%${searchText}%'
            OR v.phase_name LIKE '%${searchText}%'
        )`
      : '';

    const ipsrListQuery = `
    SELECT
        r.result_code AS result_code,
        v.phase_name AS phase_name,
        r.reported_year_id AS reporting_year,
        r.title AS result_title,
        (
            SELECT
                rt.name
            FROM
                result_type rt
            WHERE
                id = r.result_type_id
        ) AS result_type,
        (
            SELECT
                CONCAT(
                    r2.result_code,
                    ' - ',
                    r2.title
                )
            FROM
                result r2
            WHERE
                r2.id = rbip.result_id
                AND rbip.ipsr_role_id = 1
                AND rbip.is_active > 0
        ) AS core_innovation,
        (
            SELECT
                CONCAT(
                    '${env.RESULTS_URL}',
                    r2.result_code,
                    '/general-information',
                    ?,
                    'phase=',
                    r2.version_id
                )
            FROM
                result r2
            WHERE
                r2.id = rbip.result_id
                AND rbip.ipsr_role_id = 1
                AND rbip.is_active > 0
        ) AS link_core_innovation,
        IFNULL(
            (
                SELECT
                    GROUP_CONCAT(
                        IF(
                            cgs.name IS NULL,
                            "Not Provided",
                            (
                                IF(
                                    cgs.id = 3,
                                    CONCAT("National", ': '),
                                    IF((cgs.name = 'Global'), CONCAT( cgs.name, '\n'), CONCAT( cgs.name, ': '))
                                )
                            )
                        ),
                        IFNULL(
                            (
                                SELECT
                                    CONCAT(
                                        GROUP_CONCAT(
                                            DISTINCT cr.name SEPARATOR ", "
                                        ),
                                        "\n"
                                    )
                                FROM
                                    result_region rr
                                    LEFT JOIN clarisa_regions cr ON cr.um49Code = rr.region_id
                                WHERE
                                    rr.result_id = r.id
                                    AND rr.is_active = 1
                            ),
                            ''
                        ),
                        IFNULL(
                            (
                                SELECT
                                    IF(
                                        r.geographic_scope_id = 5,
                                        GROUP_CONCAT("\n", csn.res SEPARATOR "\n"),
                                        GROUP_CONCAT(csn.countries SEPARATOR ", ")
                                    )
                                FROM
                                    (
                                        SELECT
                                            CONCAT_WS(
                                                "",
                                                cc3.name,
                                                ": ",
                                                "(",
                                                IFNULL(
                                                    GROUP_CONCAT(css.name SEPARATOR ", "),
                                                    IF(
                                                        (
                                                            SELECT
                                                                COUNT(css2.id)
                                                            FROM
                                                                clarisa_subnational_scopes css2
                                                            where
                                                                css2.country_iso_alpha_2 = cc3.iso_alpha_2
                                                        ) > 0,
                                                        "Not provided",
                                                        "No sub-national levels available"
                                                    )
                                                ),
                                                ")"
                                            ) AS res,
                                            cc3.name AS countries
                                        FROM
                                            result_country rc2
                                            LEFT JOIN clarisa_countries cc3 ON cc3.id = rc2.country_id
                                            LEFT JOIN result_country_subnational rcs ON rcs.result_country_id = rc2.result_country_id
                                            AND rcs.is_active > 0
                                            LEFT JOIN clarisa_subnational_scopes css ON css.code = rcs.clarisa_subnational_scope_code
                                        WHERE
                                            rc2.result_id = r.id
                                            AND rc2.is_active = 1
                                        GROUP BY
                                            cc3.name,
                                            prdb.cc3.iso_alpha_2
                                    ) csn
                            ),
                            ''
                        ) SEPARATOR '; '
                    )
                FROM
                    clarisa_geographic_scope cgs
                WHERE
                    cgs.id = r.geographic_scope_id
                GROUP BY
                    cgs.id,
                    cgs.name
            ),
            "Not provided"
        ) AS geo_focus,
        (
            SELECT
                CONCAT(
                    u.first_name,
                    " ",
                    u.last_name
                )
            FROM
                users u
            WHERE
                u.id = r.created_by
        ) AS submitted_by,
        rs.status_name AS status,
        (
            IFNULL(
                (
                    SELECT
                        gtl.description
                    FROM
                        prdb.gender_tag_level gtl
                    WHERE
                        gtl.id = r.gender_tag_level_id
                ),
                "Not provided"
            )
        ) AS gender_tag_level,
        (
            IFNULL(
                (
                    SELECT
                        gtl.description
                    FROM
                        prdb.gender_tag_level gtl
                    WHERE
                        gtl.id = r.climate_change_tag_level_id
                ),
                "Not provided"
            )
        ) AS climate_change_tag_level,
        (
            IFNULL(
                (
                    SELECT
                        gtl.description
                    FROM
                        prdb.gender_tag_level gtl
                    WHERE
                        gtl.id = r.nutrition_tag_level_id
                ),
                "Not provided"
            )
        ) AS nutrition_tag_level,
        (
            IFNULL(
                (
                    SELECT
                        gtl.description
                    FROM
                        prdb.gender_tag_level gtl
                    WHERE
                        gtl.id = r.environmental_biodiversity_tag_level_id
                ),
                "Not provided"
            )
        ) AS environmental_biodiversity_tag_level,
        (
            IFNULL(
                (
                    SELECT
                        gtl.description
                    FROM
                        prdb.gender_tag_level gtl
                    WHERE
                        gtl.id = r.poverty_tag_level_id
                ),
                "Not provided"
            )
        ) AS poverty_tag_level,
        DATE_FORMAT(r.created_date, '%Y-%m-%d') AS creation_date,
        CONCAT(ci.official_code, " - ", ci.name) AS lead_initiative,
        IFNULL(
            (
                SELECT
                    GROUP_CONCAT(
                        ci.official_code,
                        " - ",
                        ci.name SEPARATOR "\n"
                    )
                FROM
                    results_by_inititiative rbi
                    LEFT JOIN clarisa_initiatives ci ON ci.id = rbi.inititiative_id
                WHERE
                    rbi.result_id = r.id
                    AND rbi.initiative_role_id = 2
                    AND rbi.is_active > 0
            ),
            "Not provided"
        ) AS contributing_initiatives,
        IFNULL((rip.scaling_ambition_blurb), "Not provided") AS scaling_ambition,
        IFNULL(
            (
                SELECT
                    GROUP_CONCAT(
                        DISTINCT CONCAT(
                            '• ',
                            cs.short_name,
                            ' (',
                            (
                                SELECT
                                    GROUP_CONCAT(
                                        DISTINCT cst2.sdg_target_code
                                        ORDER BY
                                            cst2.sdg_target_code SEPARATOR ', '
                                    )
                                FROM
                                    clarisa_sdgs_targets cst2
                                WHERE
                                    cst2.usnd_code = cs.usnd_code
                                    AND cst2.id IN (
                                        SELECT
                                            clarisa_sdg_target_id
                                        FROM
                                            result_ip_sdg_targets
                                        WHERE
                                            result_by_innovation_package_id = ris.result_by_innovation_package_id
                                    )
                            ),
                            ')'
                        )
                        ORDER BY
                            cs.usnd_code ASC SEPARATOR '\n'
                    )
                FROM
                    result_ip_sdg_targets ris
                    LEFT JOIN clarisa_sdgs_targets cst ON cst.id = ris.clarisa_sdg_target_id
                    LEFT JOIN clarisa_sdgs cs ON cs.usnd_code = cst.usnd_code
                WHERE
                    ris.is_active > 0
                    AND ris.result_by_innovation_package_id = rbip.result_by_innovation_package_id
                GROUP BY
                    ris.result_by_innovation_package_id
            ),
            "Not provided"
        ) AS sdg_targets,
        IFNULL(
            (
                SELECT
                    MIN(cirl.level * ciul.level) AS min_product
                FROM
                    result_by_innovation_package rbip2
                    LEFT JOIN clarisa_innovation_readiness_level cirl ON cirl.id = rbip2.readiness_level_evidence_based
                    LEFT JOIN clarisa_innovation_use_levels ciul ON ciul.id = rbip2.use_level_evidence_based
                WHERE
                    rbip2.is_active = 1
                    AND rbip2.result_innovation_package_id = rip.result_innovation_package_id
            ),
            "Not provided"
        ) AS scalability_potential_score_min,
        IFNULL(
            (
                SELECT
                    ROUND(AVG(cirl.level * ciul.level), 1) AS avg_sum
                FROM
                    result_by_innovation_package rbip2
                    LEFT JOIN clarisa_innovation_readiness_level cirl ON cirl.id = rbip2.readiness_level_evidence_based
                    LEFT JOIN clarisa_innovation_use_levels ciul ON ciul.id = rbip2.use_level_evidence_based
                WHERE
                    rbip2.is_active = 1
                    AND rbip2.result_innovation_package_id = rip.result_innovation_package_id
            ),
            "Not provided"
        ) AS scalability_potential_score_avg,
        IFNULL(
            CONCAT(
                "${env.FRONT_END_PDF_ENDPOINT_IPSR}",
                r.result_code,
                ?,
                "phase=",
                r.version_id
            ),
            "Not applicable"
        ) AS link_to_pdf
    FROM
        result r
        LEFT JOIN version v ON r.version_id = v.id
        LEFT JOIN result_innovation_package rip ON rip.result_innovation_package_id = r.id
        LEFT JOIN result_by_innovation_package rbip ON rbip.result_innovation_package_id = rip.result_innovation_package_id
        AND rbip.ipsr_role_id = 1
        LEFT JOIN result_type rt ON rt.id = r.result_type_id
        LEFT JOIN results_by_inititiative rbi ON rbi.result_id = r.id
        LEFT JOIN clarisa_initiatives ci ON ci.id = rbi.inititiative_id
        LEFT JOIN result_status rs ON rs.result_status_id = r.status_id
    WHERE
        r.is_active > 0
        AND r.result_type_id = 10
        AND rbi.initiative_role_id = 1
        AND rbi.is_active > 0
        ${initClause}
        ${phaseClause}
        ${searchClause}
    ORDER BY
        r.created_date DESC;
    `;

    try {
      const ipsrList: any[] = await this.dataSource.query(ipsrListQuery, [
        '?',
        '?',
      ]);

      return ipsrList;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: IpsrRepository.name,
        error,
        debug: true,
      });
    }
  }
}

export class GetInnovationComInterface {
  public result_by_innovation_package_id: number;
  public result_id: number;
  public result_code: number;
  public title: string;
  public short_title: string;
  public description: string;
  public other_funcions: string;
  public initiative_id: number;
  public initiative_official_code: string;
  public is_active: boolean;
  public complementaryFunctions: ComplementaryFunctionsInterface[];
  public referenceMaterials: ReferenceMaterialsInterface[];
  complementary_innovation_enabler_types_one: GetEnablersType[];
  complementary_innovation_enabler_types_two: GetEnablersType[];
}

export interface ComplementaryFunctionsInterface {
  complementary_innovation_functions_id: number;
}
export interface ReferenceMaterialsInterface {
  link: string;
}

export class GetEnablersType {
  complementary_innovation_enabler_types_id: string;
  group: string;
  type: string;
  level: number;
}
