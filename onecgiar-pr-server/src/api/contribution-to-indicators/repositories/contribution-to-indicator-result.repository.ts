import { Injectable, Logger } from '@nestjs/common';
import { ContributionToIndicatorResult } from '../entities/contribution-to-indicator-result.entity';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ContributionToIndicatorResultsDto } from '../dto/contribution-to-indicator-results.dto';
import { env } from 'process';

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

  async findResultContributionsByTocId(
    tocId: string,
  ): Promise<ContributionToIndicatorResultsDto[]> {
    const dataQuery = `
        select main_ctir.id as contribution_id, main_r.id as result_id, main_r.result_code, main_r.title as result_title,
            main_v.phase_name, main_rt.name as result_type, main_ci.official_code as result_submitter, 
            main_rs.status_name as result_status, date_format(main_r.created_date, '%Y-%m-%d') as result_creation_date,
            (
                select json_arrayagg(json_object(
                    "contribution_id", linked_ctir.id,
                    "result_id", linked_r.id,
                    "result_code", linked_r.result_code,
                    "result_title", linked_r.title,
                    "phase_name", linked_v.phase_name,
                    "result_type", linked_rt.name,
                    "result_submitter", linked_ci.official_code,
                    "result_status", linked_rs.status_name,
                    "result_creation_date", date_format(linked_r.created_date, '%Y-%m-%d')
                ))
                from ${env.DB_NAME}.linked_result lr
                left join ${env.DB_NAME}.result linked_r on linked_r.id = lr.linked_results_id and linked_r.is_active
                left join ${env.DB_NAME}.contribution_to_indicator_results linked_ctir on linked_ctir.result_id = linked_r.id 
                    and linked_ctir.is_active
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
        left join ${env.DB_NAME}.result main_r on main_r.id = rtr.results_id and main_r.is_active
        left join ${env.DB_NAME}.contribution_to_indicator_results main_ctir on main_ctir.result_id = main_r.id and main_ctir.is_active
        left join ${env.DB_NAME}.\`version\` main_v on main_r.version_id = main_v.id
        left join ${env.DB_NAME}.result_type main_rt on main_r.result_type_id = main_rt.id
        left join ${env.DB_NAME}.results_by_inititiative main_rbi on main_rbi.result_id = main_r.id and main_rbi.initiative_role_id = 1
        left join ${env.DB_NAME}.clarisa_initiatives main_ci on main_ci.id = main_rbi.inititiative_id
        left join ${env.DB_NAME}.result_status main_rs on main_rs.result_status_id = main_r.status_id
        where tri.toc_result_indicator_id = ? and tri.is_active
    `;

    return this.dataSource
      .query(dataQuery, [tocId])
      .then((result) => result)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ContributionToIndicatorResultsRepository.name,
          debug: true,
        }),
      );
  }
}
