import { Injectable } from '@nestjs/common';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { FilterInitiativesDto } from './dto/filter-initiatives.dto';
import { FilterResultsDto } from './dto/filter-results.dto';
import { env } from 'process';

@Injectable()
export class AdminPanelRepository {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {}

  async reportResultCompleteness(filterIntiatives: FilterInitiativesDto) {
    const filterByInitiatives = filterIntiatives.initiatives?.length
      ? ` and rbi.inititiative_id in (${filterIntiatives.initiatives})`
      : '';
    const filterByPhases = filterIntiatives.phases.length
      ? ` and r.version_id in (${filterIntiatives.phases})`
      : '';
    const complement = filterByInitiatives + filterByPhases;
    console.log(complement);
    const queryData = `
    SELECT
      v.id,
      r.result_code,
      r.id AS results_id,
      r.reported_year_id AS year,
      ci.official_code,
      r.title AS result_title,
      rt.name AS result_type_name,
      JSON_OBJECT(
        'name',
        'General Information',
        'value',
        v.general_information
      ) AS general_information,
      JSON_OBJECT(
        'name',
        'Theory of change',
        'value',
        v.theory_of_change
      ) AS theory_of_change,
      JSON_OBJECT(
        'name',
        'Geographic location',
        'value',
        v.geographic_location
      ) AS geographic_location,
      JSON_OBJECT(
        'name',
        'Partners',
        'value',
        v.partners
      ) AS partners,
      JSON_OBJECT(
        'name',
        'Evidence',
        'value',
        v.evidence
      ) AS evidence,
      JSON_OBJECT(
        'name',
        'Links to results',
        'value',
        v.links_to_results
      ) AS links_to_results,
      JSON_OBJECT(
        'name',
        IF(
          r.result_type_id = 5,
          'CapDev Info',
          IF(
            r.result_type_id = 7,
            'Innovation Dev Info',
            IF(
              r.result_type_id = 2,
              'Innovation Use Info',
              IF(
                r.result_type_id = 6,
                'Knowledge Product Info',
                IF(
                  r.result_type_id = 1,
                  'Policy Change Info',
                  NULL
                )
              )
            )
          )
        ),
        'value',
        v.section_seven
      ) AS section_seven,
      r.is_active,
      (
        IFNULL(v.section_seven, 1) * v.general_information * v.theory_of_change * v.partners * v.geographic_location * v.links_to_results * v.evidence
      ) AS validation,
      if(r.status_id = 3,1,0) AS is_submitted,
      ROUND(
        (
          (
            IF(v.section_seven IS NULL, 0, 1) + v.general_information + v.theory_of_change + v.partners + v.geographic_location + v.links_to_results + v.evidence
          ) * 100
        ) / IF(v.section_seven IS NULL, 6, 7)
      ) AS completeness,
      IF(
        (
          SELECT
            IF(s.id IS NULL, 0, 1)
          FROM
            submission s
          WHERE
            s.results_id = r.id
            AND is_active > 0
          LIMIT
            1
        ) > 0, 1, 0
      ) AS have_a_history,
      CONCAT(
        '${env.FRONT_END_PDF_ENDPOINT}',
        r.result_code,
        ?,
        'phase=1'
      ) AS pdf_link
    FROM
      result r
      LEFT JOIN validation v ON r.id = v.results_id
      AND r.is_active > 0
      AND v.is_active > 0
      INNER JOIN results_by_inititiative rbi ON rbi.result_id = r.id
      AND rbi.is_active > 0
      AND rbi.initiative_role_id = 1
      INNER JOIN clarisa_initiatives ci ON ci.id = rbi.inititiative_id
      INNER JOIN result_type rt ON rt.id = r.result_type_id
    WHERE
      r.is_active > 0 
      AND r.result_type_id NOT IN (10, 11)
      ${complement}
    ORDER BY
      rbi.inititiative_id ASC,
      r.result_code ASC;
    `;

    try {
      const submissionsByResult: any = await this.dataSource.query(queryData, [
        '?',
      ]);

      return submissionsByResult;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: AdminPanelRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async submissionsByResults(resultId: number) {
    const queryData = `
    SELECT
    	s.id,
    	s.status as is_submit,
    	s.comment,
    	s.created_date,
    	r.id as results_id,
    	r.result_code,
    	r.title,
    	u.id as user_id,
    	u.first_name as user_first_name,
    	u.last_name as user_last_name,
      u.email,
    	r2.description as initiative_role,
    	r3.description as app_role
    FROM
    	submission s
    inner join \`result\` r on
    	r.id = s.results_id
    inner join users u on
    	u.id = s.user_id
    LEFT join results_by_inititiative rbi on rbi.result_id = r.id 
    left join role_by_user rbu on rbu.\`user\` = u.id
                  and rbu.initiative_id = rbi.inititiative_id  
                  and rbu.action_area_id is NULL 
                  and rbu.active > 0
    left join \`role\` r2 on r2.id = rbu.\`role\` 
    left join role_by_user rbu2 on rbu2.\`user\` = u.id
                  and rbu2.initiative_id is NULL 
                  and rbu2.action_area_id is NULL 
                  and rbu2.active > 0
    left join \`role\` r3 on r3.id = rbu2.\`role\` 
    WHERE
      r.id = ?
    GROUP  by 
      s.id,
      s.status,
      s.comment,
      s.created_date,
      r.id,
      r.result_code,
      r.title,
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      r2.description,
      r3.description
    HAVING min(r3.id)
    ORDER BY
    	s.created_date DESC;
    `;
    try {
      const submissionsByResult = await this.dataSource.query(queryData, [
        resultId,
      ]);
      return submissionsByResult;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: AdminPanelRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async userReport() {
    const queryData = `
    select
    DISTINCT
    	u.id as user_id,
    	u.first_name as user_first_name,
    	u.last_name as user_last_name,
    	u.email as user_email,
    	rbu.initiative_id,
    	ci.official_code,
    	ci.name as initiative_name,
    	r.description as initiative_role_name,
    	min(r2.description) as app_role_name
    FROM
    	users u
    left join role_by_user rbu ON
    	rbu.\`user\` = u.id
    	and rbu.active > 0
    	and rbu.action_area_id is NULL
    	and rbu.initiative_id is not null
    left join clarisa_initiatives ci on
    	ci.id = rbu.initiative_id
    left join role_by_user rbu2 ON
    	rbu2.\`user\` = u.id
    	and rbu2.active > 0
    	and rbu2.action_area_id is NULL
    	and rbu2.initiative_id is null
    LEFT join \`role\` r on r.id = rbu.\`role\` 
    LEFT join \`role\` r2 on r2.id = rbu2.\`role\` 
    where
    	u.active > 0
    GROUP by 
    	u.id,
    	u.first_name,
    	u.last_name,
    	u.email,
    	rbu.initiative_id,
    	ci.official_code,
    	ci.name,
    	r.description;
    `;
    try {
      const users = await this.dataSource.query(queryData);
      return users;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: AdminPanelRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
