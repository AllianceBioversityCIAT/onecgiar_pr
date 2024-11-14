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

  async findAllToCResultsByInitiativeCode(
    initiativeCode: string,
    isOutcome: boolean,
  ) {
    const dataQuery = `
      select json_object(
        "workpackage_code", wp.wp_official_code,
        "workpackage_name", wp.name,
        "toc_results", json_arrayagg(json_object(
          "toc_result_id", toc_result.id,
          "roc_result_uuid", toc_result.toc_result_id,
          "toc_result_title", REGEXP_REPLACE(toc_result.result_title, '^[\s\n\r]+|[\s\n\r]+$', ''),
          "toc_result_description", REGEXP_REPLACE(toc_result.result_description, '^[\s\n\r]+|[\s\n\r]+$', ''),
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
              "indicator_achieved_value", cti.achieved_in_2024
            ))
            from ${env.DB_TOC}.toc_results_indicators oi
            left join ${env.DB_TOC}.toc_result_indicator_target trit 
              on oi.related_node_id = trit.toc_result_indicator_id and left(trit.target_date,4) = 2024
            left join ${env.DB_NAME}.contribution_to_indicators cti on cti.is_active
              and convert(cti.toc_result_id using utf8mb3) = convert(oi.toc_result_indicator_id using utf8mb3)
            where oi.toc_results_id = toc_result.id and oi.is_active
            group by toc_result.id
          )
        ))
      ) as workpackage
      from ${env.DB_TOC}.toc_results toc_result
      left join ${env.DB_TOC}.work_packages wp on toc_result.work_packages_id = wp.id
      right join ${env.DB_NAME}.\`version\` v on toc_result.phase = v.toc_pahse_id 
        and v.phase_year = 2024 and v.app_module_id = 1 and v.is_active = 1 and v.status = 1
      right join ${env.DB_NAME}.clarisa_initiatives ci on toc_result.id_toc_initiative = ci.toc_id and ci.official_code = ?
      where toc_result.is_active = 1 and toc_result.result_type = ?
      group by wp.id
      order by wp.id
    `;

    return this.dataSource
      .query(dataQuery, [initiativeCode, isOutcome ? 2 : 3])
      .then((data) => data.map((item) => item.workpackage))
      .catch((err) => {
        throw this._handlersError.returnErrorRepository({
          error: err,
          className: ContributionToIndicatorsRepository.name,
          debug: true,
        });
      });
  }
}
