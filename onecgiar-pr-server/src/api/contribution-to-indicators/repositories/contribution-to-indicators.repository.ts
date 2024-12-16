import { Injectable, Logger } from '@nestjs/common';
import { ContributionToIndicator } from '../entities/contribution-to-indicator.entity';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { env } from 'process';

@Injectable()
export class ContributionToIndicatorsRepository extends Repository<ContributionToIndicator> {
  private readonly _logger: Logger = new Logger(
    ContributionToIndicatorsRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ContributionToIndicator, dataSource.createEntityManager());
  }

  async findAllOutcomesByInitiativeCode(initiativeCode: string) {
    const relationName = 'outcome';
    const dataQuery = `
      select json_object(
        "workpackage_code", wp.wp_official_code,
        "workpackage_name", wp.name,
        "workpackage_short_name", wp.acronym,
        "toc_results", json_arrayagg(${this._getTocResultSubquery(relationName)})
      ) as workpackage
      from ${env.DB_NAME}.clarisa_initiatives ci
      left join ${env.DB_NAME}.clarisa_initiative_stages cis on cis.initiative_id = ci.id and cis.active
      left join ${env.DB_TOC}.work_packages wp on wp.initvStgId = cis.id
      left join ${env.DB_TOC}.toc_results ${relationName} on ${relationName}.is_active and ${relationName}.result_type = 2
	      and ${relationName}.id_toc_initiative = ci.toc_id and ${relationName}.work_packages_id = wp.id
      right join ${env.DB_NAME}.\`version\` v on ${relationName}.phase = v.toc_pahse_id 
        and v.phase_year = 2024 and v.app_module_id = 1 and v.is_active = 1 and v.status = 1
      where ci.official_code = ?
      group by wp.id
      order by wp.id
    `;

    return this.dataSource
      .query(dataQuery, [initiativeCode])
      .then((data) => data.map((item) => item.workpackage))
      .catch((err) => {
        throw this._handlersError.returnErrorRepository({
          error: err,
          className: ContributionToIndicatorsRepository.name,
          debug: true,
        });
      });
  }

  async findAllEoisByInitiativeCode(initiativeCode: string) {
    const relationName = 'eoi';
    const dataQuery = `
      select ${this._getTocResultSubquery(relationName)} as eois
      from ${env.DB_NAME}.clarisa_initiatives ci
      left join ${env.DB_TOC}.toc_results ${relationName} on ${relationName}.is_active and ${relationName}.result_type = 3
        and ${relationName}.id_toc_initiative = ci.toc_id
      right join ${env.DB_NAME}.\`version\` v on ${relationName}.phase = v.toc_pahse_id 
        and v.phase_year = 2024 and v.app_module_id = 1 and v.is_active = 1 and v.status = 1
      where ci.official_code = ?
    `;

    return this.dataSource
      .query(dataQuery, [initiativeCode])
      .then((data) => data.map((item) => item.eois))
      .catch((err) => {
        throw this._handlersError.returnErrorRepository({
          error: err,
          className: ContributionToIndicatorsRepository.name,
          debug: true,
        });
      });
  }

  private _getTocResultSubquery(outerRelationName: string): string {
    return `json_object(
          "toc_result_id", ${outerRelationName}.id,
          "toc_result_uuid", ${outerRelationName}.toc_result_id,
          "toc_result_title", REGEXP_REPLACE(${outerRelationName}.result_title, '^[\s\n\r]+|[\s\n\r]+$', ''),
          "toc_result_description", REGEXP_REPLACE(${outerRelationName}.result_description, '^[\s\n\r]+|[\s\n\r]+$', ''),
          "indicators", (
            select json_arrayagg(json_object(
              "indicator_id", oi.id,
              "indicator_uuid", oi.toc_result_indicator_id,
              "indicator_description", REGEXP_REPLACE(oi.indicator_description, '^[\s\n\r]+|[\s\n\r]+$', ''),
              "indicator_name", REGEXP_REPLACE(oi.type_name, '^[\s\n\r]+|[\s\n\r]+$', ''),
              "is_indicator_custom", if(trim(oi.type_value) like 'custom', true, false),
              "indicator_baseline", oi.baseline_value,
              "indicator_target_value", trit.target_value,
              "indicator_target_date", trit.target_date,
              "indicator_achieved_value", cti.achieved_in_2024,
              "indicator_submission_status", if(cti.id is null, 0, (
               	CASE
               		when indicator_s.result_status_id = 1 then 0
               		when indicator_s.result_status_id = 3 then 1
               		else null
               	END
              )),
              "indicator_supporting_results", (${this._flattenedResultsQuery('oi.toc_result_indicator_id')}),
              "indicator_achieved_narrative", cti.narrative_achieved_in_2024
            ))
            from ${env.DB_TOC}.toc_results_indicators oi
            left join ${env.DB_TOC}.toc_result_indicator_target trit 
              on oi.related_node_id = trit.toc_result_indicator_id and left(trit.target_date,4) = 2024
            left join ${env.DB_NAME}.contribution_to_indicators cti on cti.is_active
              and convert(cti.toc_result_id using utf8mb4) = convert(oi.toc_result_indicator_id using utf8mb4)
            left join ${env.DB_NAME}.contribution_to_indicator_submissions ctis on ctis.contribution_to_indicator_id = cti.id
            	and ctis.is_active
            left join ${env.DB_NAME}.result_status indicator_s on ctis.status_id = indicator_s.result_status_id
            where oi.toc_results_id = ${outerRelationName}.id and oi.is_active
            group by ${outerRelationName}.id
          )
        )`;
  }

  private _flattenedResultsQuery(tocId: string) {
    return `
      select json_arrayagg(json_object(
        "contribution_id", contribution_id,
        "is_active", is_active,
        "result_id", result_id,
        "result_code", result_code,
        "title", result_title,
        "phase_name", phase_name,
        "version_id", phase_id,
        "result_type", result_type,
        "result_submitter", result_submitter,
        "status_name", result_status,
        "created_date", result_creation_date
      ))
      from (
        select main_ctir.id as contribution_id, main_ctir.is_active, main_r.id as result_id, main_r.result_code, main_r.title as result_title,
          main_v.phase_name, main_v.id as phase_id, main_rt.name as result_type, main_ci.official_code as result_submitter, 
          main_rs.status_name as result_status, date_format(main_r.created_date, '%Y-%m-%d') as result_creation_date
        from ${env.DB_TOC}.toc_results_indicators tri
        right join ${env.DB_TOC}.toc_results indicator_outcome on tri.toc_results_id = indicator_outcome.id
        right join ${env.DB_TOC}.toc_results outcomes on outcomes.toc_result_id = indicator_outcome.toc_result_id
        right join ${env.DB_NAME}.results_toc_result rtr on rtr.toc_result_id = outcomes.id and rtr.is_active
        left join ${env.DB_NAME}.result main_r on main_r.id = rtr.results_id and main_r.is_active
        left join ${env.DB_NAME}.contribution_to_indicator_results main_ctir on main_ctir.result_id = main_r.id 
        left join ${env.DB_NAME}.\`version\` main_v on main_r.version_id = main_v.id
        left join ${env.DB_NAME}.result_type main_rt on main_r.result_type_id = main_rt.id
        left join ${env.DB_NAME}.results_by_inititiative main_rbi on main_rbi.result_id = main_r.id 
          and main_rbi.initiative_role_id = 1 and rtr.initiative_id = main_rbi.inititiative_id
        left join ${env.DB_NAME}.clarisa_initiatives main_ci on main_ci.id = main_rbi.inititiative_id
        left join ${env.DB_NAME}.result_status main_rs on main_rs.result_status_id = main_r.status_id
        where tri.toc_result_indicator_id = ${tocId} and tri.is_active and main_r.id is not null
      ) inner_q
    `;
  }
}
