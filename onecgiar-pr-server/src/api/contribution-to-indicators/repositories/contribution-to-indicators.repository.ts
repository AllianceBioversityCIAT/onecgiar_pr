import { Injectable, Logger } from '@nestjs/common';
import { ContributionToIndicator } from '../entities/contribution-to-indicator.entity';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { env } from 'process';
import { ContributionToWpOutcomeDto } from '../dto/contribution-to-wp-outcome.dto';
import { ContributionToEoiOutcomeDto } from '../dto/contribution-to-eoi-outcome.dto';
import { ContributionToIndicatorResultsRepository } from './contribution-to-indicator-result.repository';

@Injectable()
export class ContributionToIndicatorsRepository extends Repository<ContributionToIndicator> {
  private readonly _logger: Logger = new Logger(
    ContributionToIndicatorsRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
    private readonly _contributionToIndicatorResultsRepository: ContributionToIndicatorResultsRepository,
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

    const result = await this.dataSource
      .query(dataQuery, [initiativeCode])
      .then((data: ContributionToWpOutcomeDto[]) =>
        data.map((item) => item.workpackage),
      )
      .catch((err) => {
        throw this._handlersError.returnErrorRepository({
          error: err,
          className: ContributionToIndicatorsRepository.name,
          debug: true,
        });
      });

    for (const wp of result) {
      for (const tocResult of wp.toc_results ?? []) {
        for (const indicator of tocResult.indicators ?? []) {
          const results = await this.dataSource
            .query(this._flattenedResultsQuery(), [
              indicator.indicator_uuid,
              indicator.indicator_uuid,
            ])
            .then((data) => data[0].results)
            .then((data) =>
              this._contributionToIndicatorResultsRepository.removeInactives(
                data ?? [],
              ),
            )
            .catch((err) => {
              throw this._handlersError.returnErrorRepository({
                error: err,
                className: ContributionToIndicatorsRepository.name,
                debug: true,
              });
            });

          indicator.indicator_supporting_results = results;
        }
      }
    }

    return result;
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

    const result = await this.dataSource
      .query(dataQuery, [initiativeCode])
      .then((data: ContributionToEoiOutcomeDto[]) =>
        data.flatMap((item) => item.eois),
      )
      .catch((err) => {
        throw this._handlersError.returnErrorRepository({
          error: err,
          className: ContributionToIndicatorsRepository.name,
          debug: true,
        });
      });

    for (const eoi of result) {
      for (const indicator of eoi.indicators ?? []) {
        const results = await this.dataSource
          .query(this._flattenedResultsQuery(), [
            indicator.indicator_uuid,
            indicator.indicator_uuid,
          ])
          .then((data) => data[0].results)
          .then((data) =>
            this._contributionToIndicatorResultsRepository.removeInactives(
              data ?? [],
            ),
          )
          .catch((err) => {
            throw this._handlersError.returnErrorRepository({
              error: err,
              className: ContributionToIndicatorsRepository.name,
              debug: true,
            });
          });

        indicator.indicator_supporting_results = results;
      }
    }

    return result;
  }

  private _getTocResultSubquery(outerRelationName: string): string {
    return `json_object(
          "toc_result_id", ${outerRelationName}.id,
          "toc_result_uuid", ${outerRelationName}.toc_result_id,
          "toc_result_title", REGEXP_REPLACE(${outerRelationName}.result_title, '^[[:space:]]+|[[:space:]]+$', ''),
          "toc_result_description", REGEXP_REPLACE(${outerRelationName}.result_description, '^[[:space:]]+|[[:space:]]+$', ''),
          "indicators", (
            select json_arrayagg(json_object(
              "indicator_id", oi.id,
              "indicator_uuid", oi.related_node_id,
              "indicator_description", REGEXP_REPLACE(oi.indicator_description, '^[[:space:]]+|[[:space:]]+$', ''),
              "indicator_name", REGEXP_REPLACE(oi.type_name, '^[[:space:]]+|[[:space:]]+$', ''),
              "is_indicator_custom", if(trim(oi.type_value) like 'custom', true, false),
              "indicator_baseline", oi.baseline_value,
              "unit_of_measurement", oi.unit_messurament,
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
              "indicator_achieved_narrative", cti.narrative_achieved_in_2024
            ))
            from ${env.DB_TOC}.toc_results_indicators oi
            left join ${env.DB_TOC}.toc_result_indicator_target trit 
              on oi.related_node_id = trit.toc_result_indicator_id and left(trit.target_date,4) = 2024
            left join ${env.DB_NAME}.contribution_to_indicators cti on cti.is_active
              and convert(cti.toc_result_id using utf8mb4) = convert(oi.related_node_id using utf8mb4)
            left join ${env.DB_NAME}.contribution_to_indicator_submissions ctis on ctis.contribution_to_indicator_id = cti.id
            	and ctis.is_active
            left join ${env.DB_NAME}.result_status indicator_s on ctis.status_id = indicator_s.result_status_id
            where oi.toc_results_id = ${outerRelationName}.id and oi.is_active
            group by ${outerRelationName}.id
          )
        )`;
  }

  private _flattenedResultsQuery() {
    const query =
      this._contributionToIndicatorResultsRepository.getContributingResultsQuery();
    const sql = `
      select json_arrayagg(json_object(
        "contribution_id", contribution_id,
        "is_active", is_active,
        "result_id", result_id,
        "result_code", result_code,
        "title", title,
        "phase_name", phase_name,
        "version_id", version_id,
        "is_ipsr", is_ipsr,
        "result_type", result_type,
        "result_submitter", result_submitter,
        "status_name", status_name,
        "created_date", created_date,
        "is_manually_mapped", is_manually_mapped
      )) as results
      from (${query}) inner_q
    `;

    return sql;
  }
}
