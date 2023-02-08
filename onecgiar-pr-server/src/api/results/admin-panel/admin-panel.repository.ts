import { Injectable } from '@nestjs/common';
import { DataSource, Repository, QueryRunner } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { FilterInitiativesDto } from './dto/filter-initiatives.dto';
import { FilterResultsDto } from './dto/filter-results.dto';

@Injectable()
export class AdminPanelRepository {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {}

  async reportResultCompleteness(filterIntiatives: FilterInitiativesDto) {
    const complement =
      filterIntiatives.rol_user != 1
        ? 'and rbi.inititiative_id in (' + filterIntiatives.initiatives + ')'
        : '';
    const queryData = `
    SELECT
    v.id,
    r.result_code,
    r.id as results_id,
    ci.official_code,
    r.title as result_title,
    rt.name as result_type_name,
    JSON_OBJECT('name',
    'General Information',
    'value',
    v.general_information) as general_information,
    JSON_OBJECT('name',
    'Theory of change',
    'value',
    v.theory_of_change) as theory_of_change,
    JSON_OBJECT('name',
    'Geographic location',
    'value',
    v.geographic_location) as geographic_location,
    JSON_OBJECT('name',
    'Partners',
    'value',
    v.partners) as partners,
    JSON_OBJECT('name',
    'Evidence',
    'value',
    v.evidence) as evidence,
    JSON_OBJECT('name',
    'Links to results',
    'value',
    v.links_to_results) as links_to_results,
    JSON_OBJECT('name',
    if(r.result_type_id = 5,
    'CapDev Info',
    if(r.result_type_id = 7,
    'Innovation Dev Info',
    if(r.result_type_id = 2,
    'Innovation Use Info',
    if(r.result_type_id = 6,
    'Knowledge Product Info',
    if(r.result_type_id = 1,
    'Policy Change Info',
    null)))
    )
    ),
    'value',
    v.section_seven) as section_seven,
    r.is_active,
    (IFNULL(v.section_seven, 1) *
    v.general_information *
    v.theory_of_change *
    v.partners *
    v.geographic_location *
    v.links_to_results *
    v.evidence) as validation,
    r.status as is_submitted,
    ROUND(((IF(v.section_seven is null, 0, 1) +
    v.general_information +
    v.theory_of_change +
    v.partners +
    v.geographic_location +
    v.links_to_results +
    v.evidence)* 100) / if(v.section_seven is null, 6, 7)) as completeness
  FROM
  result r
  left join validation v on
    r.id = v.results_id
    and r.is_active > 0
    and v.is_active > 0
  inner JOIN results_by_inititiative rbi on
    rbi.result_id = r.id
    and rbi.is_active > 0
    and rbi.initiative_role_id = 1
  INNER JOIN clarisa_initiatives ci on
    ci.id = rbi.inititiative_id
  inner join result_type rt on
    rt.id = r.result_type_id
  WHERE r.is_active > 0 ${complement}
  order by
     rbi.inititiative_id ASC,r.result_code ASC;
    `;

    try {
      let submissionsByResult: any = await this.dataSource.query(queryData);

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
    	r2.description as app_role_name
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
    	u.active > 0;
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
