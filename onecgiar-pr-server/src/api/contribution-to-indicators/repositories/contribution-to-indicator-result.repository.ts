import { Injectable, Logger } from '@nestjs/common';
import { ContributionToIndicatorResult } from '../entities/contribution-to-indicator-result.entity';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ContributionToIndicatorResultsDto } from '../dto/contribution-to-indicator-results.dto';
import { env } from 'process';
import { ContributionToIndicatorsDto } from '../dto/contribution-to-indicators.dto';

@Injectable()
export class ContributionToIndicatorResultsRepository extends Repository<ContributionToIndicatorResult> {
  private readonly _logger: Logger = new Logger(
    ContributionToIndicatorResultsRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ContributionToIndicatorResult, dataSource.createEntityManager());
  }

  async findBasicContributionIndicatorDataByTocId(
    tocId: string,
  ): Promise<ContributionToIndicatorsDto> {
    const dataQuery = `
      select cti.id as contribution_id, cti.achieved_in_2024, cti.narrative_achieved_in_2024,
        cti.toc_result_id, REGEXP_REPLACE(tri.indicator_description, '^[\s\n\r]+|[\s\n\r]+$', '') as indicator_name, 
        tri.unit_messurament as unit_measurement, tri.baseline_value as indicator_baseline,
        trit.target_value as indicator_target, REGEXP_REPLACE(tr.result_title, '^[\s\n\r]+|[\s\n\r]+$', '') as outcome_name,
        REGEXP_REPLACE(tr.result_description, '^[\s\n\r]+|[\s\n\r]+$', '') as outcome_description, wp.name as workpackage_name,
        wp.acronym as workpackage_short_name, concat(ci.official_code, ' - <b>', ci.short_name, '</b> - ', ci.name) as indicator_initiative, ci.official_code as initiative_official_code,
        (
        	CASE
            when indicator_s.result_status_id = 1 then 0
            when indicator_s.result_status_id = 3 then 1
            else null
			    END
        ) submission_status
      from ${env.DB_NAME}.contribution_to_indicators cti
      left join ${env.DB_NAME}.contribution_to_indicator_submissions ctis on ctis.contribution_to_indicator_id = cti.id
      	and ctis.is_active
      left join ${env.DB_NAME}.result_status indicator_s on ctis.status_id = indicator_s.result_status_id
      left join ${env.DB_TOC}.toc_results_indicators tri on tri.is_active
        and convert(tri.toc_result_indicator_id using utf8mb4) = convert(cti.toc_result_id using utf8mb4) 
      left join ${env.DB_TOC}.toc_result_indicator_target trit 
        on tri.related_node_id = trit.toc_result_indicator_id and left(trit.target_date,4) = 2024
      right join ${env.DB_TOC}.toc_results tr on tr.id = tri.toc_results_id
      left join ${env.DB_NAME}.clarisa_initiatives ci on ci.toc_id = tr.id_toc_initiative
      left join ${env.DB_TOC}.work_packages wp on tr.work_packages_id = wp.id
      where cti.toc_result_id = ? and cti.is_active
    `;

    return this.dataSource
      .query(dataQuery, [tocId])
      .then((result) => {
        if (!result?.length) {
          throw Error(
            `Basic data for Contribution to Indicator with tocId ${tocId} could not be found`,
          );
        }
        return result[0];
      })
      .catch((err) => {
        throw this._handlersError.returnErrorRepository({
          error: err,
          className: ContributionToIndicatorResultsRepository.name,
          debug: true,
        });
      });
  }

  async findResultContributionsByTocId(
    tocId: string,
  ): Promise<ContributionToIndicatorResultsDto[]> {
    const dataQuery = `
      select main_ctir.id as contribution_id, main_ctir.is_active, main_r.id as result_id, main_r.result_code, main_r.title as result_title,
        main_v.phase_name, main_v.id as phase_id, main_rt.name as result_type, main_ci.official_code as result_submitter, 
        main_rs.status_name as result_status, date_format(main_r.created_date, '%Y-%m-%d') as result_creation_date,
        (
          select json_arrayagg(json_object(
            "contribution_id", linked_ctir.id,
            "is_active", linked_ctir.is_active,
            "result_id", linked_r.id,
            "result_code", linked_r.result_code,
            "result_title", linked_r.title,
            "phase_name", linked_v.phase_name,
            "phase_id", linked_v.id,
            "result_type", linked_rt.name,
            "result_submitter", linked_ci.official_code,
            "result_status", linked_rs.status_name,
            "result_creation_date", date_format(linked_r.created_date, '%Y-%m-%d')
          ))
          from ${env.DB_NAME}.linked_result lr
          left join ${env.DB_NAME}.result linked_r on linked_r.id = lr.linked_results_id and linked_r.is_active
          left join ${env.DB_NAME}.contribution_to_indicator_results linked_ctir on linked_ctir.result_id = linked_r.id 
            and linked_ctir.contribution_to_indicator_id = cti.id 
          left join ${env.DB_NAME}.\`version\` linked_v on linked_r.version_id = linked_v.id
          left join ${env.DB_NAME}.result_type linked_rt on linked_r.result_type_id = linked_rt.id
          left join ${env.DB_NAME}.results_by_inititiative linked_rbi on linked_rbi.result_id = linked_r.id and linked_rbi.initiative_role_id = 1
          left join ${env.DB_NAME}.clarisa_initiatives linked_ci on linked_ci.id = linked_rbi.inititiative_id
          left join ${env.DB_NAME}.result_status linked_rs on linked_rs.result_status_id = linked_r.status_id
          where lr.origin_result_id = main_r.id and lr.is_active
          group by main_r.id
        ) as linked_results
      from ${env.DB_TOC}.toc_results_indicators tri
      right join ${env.DB_TOC}.toc_results outcomes on tri.toc_results_id = outcomes.id
      right join ${env.DB_NAME}.results_toc_result rtr on rtr.toc_result_id = outcomes.id and rtr.is_active
      left join ${env.DB_NAME}.contribution_to_indicators cti on 
        convert(cti.toc_result_id using utf8mb4) = convert(tri.toc_result_indicator_id using utf8mb4) and cti.is_active
      left join ${env.DB_NAME}.result main_r on main_r.id = rtr.results_id and main_r.is_active
      left join ${env.DB_NAME}.contribution_to_indicator_results main_ctir on main_ctir.result_id = main_r.id 
        and main_ctir.contribution_to_indicator_id = cti.id
      left join ${env.DB_NAME}.\`version\` main_v on main_r.version_id = main_v.id
      left join ${env.DB_NAME}.result_type main_rt on main_r.result_type_id = main_rt.id
      left join ${env.DB_NAME}.results_by_inititiative main_rbi on main_rbi.result_id = main_r.id 
        and main_rbi.initiative_role_id = 1 and rtr.initiative_id = main_rbi.inititiative_id
      left join ${env.DB_NAME}.clarisa_initiatives main_ci on main_ci.id = main_rbi.inititiative_id
      left join ${env.DB_NAME}.result_status main_rs on main_rs.result_status_id = main_r.status_id
      where tri.toc_result_indicator_id = ? and tri.is_active
    `;

    return this.dataSource
      .query(dataQuery, [tocId])
      .then((result) => result)
      .catch((err) => {
        throw this._handlersError.returnErrorRepository({
          error: err,
          className: ContributionToIndicatorResultsRepository.name,
          debug: true,
        });
      });
  }
}
