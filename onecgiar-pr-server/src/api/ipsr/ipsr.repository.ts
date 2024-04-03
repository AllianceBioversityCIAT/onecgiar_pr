import { Injectable } from '@nestjs/common';

import { DataSource } from 'typeorm';
import { Ipsr } from './entities/ipsr.entity';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ResultCountriesSubNational } from '../results/result-countries-sub-national/entities/result-countries-sub-national.entity';
import { LogicalDelete } from '../../shared/globalInterfaces/delete.interface';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
  ReplicableInterface
} from '../../shared/globalInterfaces/replicable.interface';
import { predeterminedDateValidation } from '../../shared/utils/versioning.utils';
import { BaseRepository } from '../../shared/extendsGlobalDTO/base-repository';

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
          ${predeterminedDateValidation(config.predetermined_date)} AS created_date,
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
          ${predeterminedDateValidation(config.predetermined_date)} AS created_date,
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
            rbi.inititiative_id AS initiative_id,
            rs.status_name AS status,
            r.reported_year_id,
            (
                SELECT
                    ci.official_code
                FROM
                    clarisa_initiatives ci
                WHERE
                    ci.id = rbi.inititiative_id
            ) AS official_code,
            rt.name AS result_type, 
            r.result_level_id,
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
            v.phase_name,
            v.phase_year,
            v.status as phase_status,
            r.version_id
        FROM
            result r
            LEFT JOIN results_by_inititiative rbi ON rbi.result_id = r.id
            LEFT JOIN result_by_innovation_package ibr ON ibr.result_innovation_package_id = r.id
            LEFT JOIN result_type rt ON rt.id = r.result_type_id 
            INNER JOIN result_status rs ON rs.result_status_id = r.status_id 
            INNER JOIN version v ON v.id = r.version_id
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

  async getStepTwoOne(resultId: number) {
    const query = `
        SELECT
            rbip.result_by_innovation_package_id,
        	rbip.result_id,
        	r.result_code,
        	r.title,
        	r.description,
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
      const results: getInnovationComInterface[] = await this.query(query, [
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
        WHERE rbip.result_innovation_package_id = ?;
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
            ) AS official_code
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
}

export class getInnovationComInterface {
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
  complementary_innovation_enabler_types_one: getEnablersType[];
  complementary_innovation_enabler_types_two: getEnablersType[];
}

export interface ComplementaryFunctionsInterface {
  complementary_innovation_functions_id: number;
}
export interface ReferenceMaterialsInterface {
  link: string;
}

export class getEnablersType {
  complementary_innovation_enabler_types_id: string;
  group: string;
  type: string;
  level: number;
}
