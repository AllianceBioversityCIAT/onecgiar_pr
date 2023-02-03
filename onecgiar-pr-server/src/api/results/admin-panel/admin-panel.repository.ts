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

  async excelFullReportByResultCodes(filterResults: FilterResultsDto) {
    const resultCodes = (filterResults?.resultCodes ?? []).join(',');
    const query = `
    select 
    r.result_code,
    r.id as result_id,
    rl.name as result_level,
    rt.name as result_type,
    r.title as result_titel,
    r.description as result_description,
    r.lead_contact_person,
    gtl.title as gender_tag_level,
    gtl2.title as climate_change_tag_level,
    if(r.is_krs is null,null,if(r.is_krs,'True','False')) as key_result_story,
    ci.official_code as primary_submitter,
    GROUP_CONCAT(distinct ci2.official_code SEPARATOR ', ') as contributing_initiatives,
    GROUP_CONCAT(CONCAT('(Funder name: ',ci4.acronym,' - ',ci4.name ,', Grant title: ',npp.grant_title,', Center Grant ID: ',IFNULL(npp.center_grant_id, 'Not applicable'),', Lead/Contract Center: ',ci3.name,')') SEPARATOR ', ') as non_pooled_project,
    GROUP_CONCAT(CONCAT(if(rc.is_primary,'(Primary: ','('),ci4.acronym,' - ',ci4.name,')') SEPARATOR ', ') as contributing_centers,
    CONCAT('(',ci.official_code,' - ',ci.short_name,'): ', 'Toc Level: ' ,IFNULL(tl.name , 'Not provider'), ', ToC result title:' ,IFNULL(tr.title, 'Not provider')) as theory_change,
    GROUP_CONCAT(distinct CONCAT('(',ci6.official_code,' - ',ci6.short_name,'): ', 'Toc Level: ' ,IFNULL(tl2.name , 'Not provider'), ', ToC result title:' ,IFNULL(tr2.title, 'Not provider')) SEPARATOR ', ') as Contributing_theory_change,
    r.no_applicable_partner,
    GROUP_CONCAT(DISTINCT concat('(',prt.name, ', Deliveries type: ', prt.deliveries_type,')') SEPARATOR ', '),
    cgs.name as result_scope,
    GROUP_CONCAT(DISTINCT cr.name separator ', ') as regions,
    if(rt.id<>6, GROUP_CONCAT(DISTINCT cc3.name separator ', '), rkp.cgspace_countries) as countries,
    GROUP_CONCAT(DISTINCT CONCAT('(',res2.result_code,': ',res2.result_type,' - ', res2.title,')')) as result_links,
    GROUP_CONCAT(DISTINCT lr2.legacy_link separator ', ') as result_legacy_links
    FROM 
    \`result\` r
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
    left join (select rbi3.result_id, ci7.name, GROUP_CONCAT(pdt.name separator ', ') as deliveries_type  
    from results_by_institution rbi3 
    left join result_by_institutions_by_deliveries_type rbibdt on rbibdt.result_by_institution_id = rbi3.id 
    and rbibdt.is_active > 0
    left join clarisa_institutions ci7 on ci7.id = rbi3.institutions_id
    left JOIN partner_delivery_type pdt on pdt.id = rbibdt.partner_delivery_type_id
    WHERE rbi3.institution_roles_id = 2
    and rbi3.is_active > 0
    GROUP by rbi3.result_id, ci7.name) prt on prt.result_id = r.id
    left join result_region rr ON rr.result_id = r.id 
    and rr.is_active > 0
    left join clarisa_regions cr on cr.um49Code = rr.region_id 
    left join result_country rc2 on rc2.result_id = r.id 
    and rc2.is_active > 0
    left join clarisa_countries cc3 on cc3.id = rc2.country_id 
    left join clarisa_geographic_scope cgs ON cgs.id = r.geographic_scope_id 
    left join linked_result lr on lr.origin_result_id = r.id
    and lr.linked_results_id is not NULL 
    and lr.is_active > 0
    and lr.legacy_link is NULL 
    left join (select r2.id, r2.result_code, r2.title, rt2.name as result_type 
    from \`result\` r2 
    left join result_type rt2 on rt2.id = r2.result_type_id
    where r2.is_active > 0) res2 on res2.id = lr.linked_results_id
    left join linked_result lr2 on lr2.origin_result_id = r.id
    and lr2.linked_results_id is NULL 
    and lr2.is_active > 0
    and lr2.legacy_link is not NULL
    left join results_knowledge_product rkp on rkp.results_id = r.id and rkp.is_active > 0
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
    cgs.name;
    `;

    try {
      let report: any = await this.dataSource.query(query);

      return report;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: AdminPanelRepository.name,
        error: error,
        debug: true,
      });
    }
  }

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
