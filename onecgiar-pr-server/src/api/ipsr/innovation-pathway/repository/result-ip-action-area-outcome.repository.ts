import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultIpAAOutcome } from '../entities/result-ip-action-area-outcome.entity';
import { env } from 'process';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';
import { predeterminedDateValidation } from '../../../../shared/utils/versioning.utils';
import { ReplicableConfigInterface, ConfigCustomQueryInterface } from '../../../../shared/globalInterfaces/replicable.interface';

@Injectable()
export class ResultIpAAOutcomeRepository
  extends BaseRepository<ResultIpAAOutcome>
  implements LogicalDelete<ResultIpAAOutcome>
{
  createQueries(
    config: ReplicableConfigInterface<ResultIpAAOutcome>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      SELECT
          is_active,
          ${predeterminedDateValidation(config.predetermined_date)} AS created_date,
          last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          ${config.new_ipsr_id} AS result_by_innovation_package_id,
          action_area_outcome_id
      FROM
          result_ip_action_area_outcome
      WHERE
        result_by_innovation_package_id = ${config.old_ipsr_id}
        AND is_active > 0;
    `,
      insertQuery: `
      INSERT INTO
        result_ip_action_area_outcome (
            is_active,
            created_date,
            last_updated_date,
            created_by,
            last_updated_by,
            result_by_innovation_package_id,
            action_area_outcome_id
        )
      SELECT
        is_active,
        ${predeterminedDateValidation(config.predetermined_date)} AS created_date,
        last_updated_date,
        ${config.user.id} AS created_by,
        ${config.user.id} AS last_updated_by,
        ${config.new_ipsr_id} AS result_by_innovation_package_id,
        action_area_outcome_id
      FROM
          result_ip_action_area_outcome
      WHERE
        result_by_innovation_package_id = ${config.old_ipsr_id}
        AND is_active > 0;
      `,
      returnQuery: `
      SELECT
          is_active,
          ${predeterminedDateValidation(config.predetermined_date)} AS created_date,
          last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          ${config.new_ipsr_id} AS result_by_innovation_package_id,
          action_area_outcome_id
      FROM
          result_ip_action_area_outcome
      WHERE
        result_by_innovation_package_id = ${config.new_ipsr_id}
        AND is_active > 0;
      `,
    };
  }

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultIpAAOutcome, dataSource.createEntityManager());
  }
  fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete riaao from result_ip_action_area_outcome riaao 
    inner join result_by_innovation_package rbip on rbip.result_by_innovation_package_id = riaao.result_by_innovation_package_id 
    where rbip.result_innovation_package_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultIpAAOutcomeRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultIpAAOutcome> {
    const dataQuery = `update result_ip_action_area_outcome riaao 
    inner join result_by_innovation_package rbip on rbip.result_by_innovation_package_id = riaao.result_by_innovation_package_id 
    set riaao.is_active = 0
    where riaao.is_active > 0
        and rbip.result_innovation_package_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultIpAAOutcomeRepository.name,
          debug: true,
        }),
      );
  }

  async mapActionAreaOutcome(coreId: number, initId: number) {
    try {
      const aaOutcomeQuery = `
      SELECT
        DISTINCT caaoi.outcome_smo_code
      FROM
        ${env.DB_OST}.clarisa_action_areas_outcomes_indicators caaoi
        LEFT JOIN ${env.DB_OST}.toc_action_area_results taar ON taar.outcome_id = caaoi.outcome_id
        LEFT JOIN ${env.DB_OST}.toc_results_action_area_results traar ON traar.action_area_toc_result_id = taar.toc_result_id
      WHERE
        taar.is_active = 1
        AND traar.toc_result_id IN (
          SELECT
              tr2.toc_internal_id
          FROM
              prdb.toc_result tr2
              LEFT JOIN prdb.results_toc_result rtr ON rtr.toc_result_id = tr2.toc_result_id
              AND rtr.is_active = 1
          WHERE
              rtr.results_id = ?
              AND rtr.initiative_id = ?
              AND tr2.inititiative_id = ?
              AND tr2.is_active = 1
        );
      `;

      const aaOutcome: any[] = await this.dataSource.query(aaOutcomeQuery, [
        coreId,
        initId,
        initId,
      ]);
      return aaOutcome;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultIpAAOutcomeRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAAOutcomes(resultByInnovationPackageId: number) {
    const query = `
    SELECT 
      riaa.action_area_outcome_id,
      caao.actionAreaId,
      caao.outcomeSMOcode,
      caao.outcomeStatement
    FROM
      result_ip_action_area_outcome riaa
      LEFT JOIN clarisa_action_area_outcome caao ON caao.id = riaa.action_area_outcome_id
    WHERE riaa.is_active > 0
        AND riaa.result_by_innovation_package_id = ?
    ORDER BY caao.outcomeSMOcode ASC;
    `;

    try {
      const aaOutcome: any[] = await this.query(query, [
        resultByInnovationPackageId,
      ]);
      return aaOutcome;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultIpAAOutcomeRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async retrieveAaOutcomes(
    coreResultId: number,
    coreInitId: number,
    resultByInnovationPackageId: number,
    user: number,
  ) {
    try {
      const aa_query = `
      INSERT INTO
          result_ip_action_area_outcome (
              action_area_outcome_id,
              created_by,
              last_updated_by,
              result_by_innovation_package_id,
              version_id
          )
      SELECT
          DISTINCT caao.id AS action_area_outcome_id,
          ${user} AS created_by,
          ${user} AS last_updated_by,
          ${resultByInnovationPackageId} AS result_by_innovation_package_id,
          1 AS version_id
      FROM
          ${env.DB_OST}.clarisa_action_areas_outcomes_indicators caaoi
          LEFT JOIN ${env.DB_OST}.toc_action_area_results taar ON taar.outcome_id = caaoi.outcome_id
          LEFT JOIN ${env.DB_OST}.toc_results_action_area_results traar ON traar.action_area_toc_result_id = taar.toc_result_id
          INNER JOIN prdb.clarisa_action_area_outcome caao ON caao.outcomeSMOcode = caaoi.outcome_smo_code
      WHERE
          taar.is_active = 1
          AND traar.toc_result_id IN (
              SELECT
                  tr2.toc_internal_id
              FROM
                  prdb.toc_result tr2
                  LEFT JOIN prdb.results_toc_result rtr ON rtr.toc_result_id = tr2.toc_result_id
                  AND rtr.is_active = 1
              WHERE
                  rtr.results_id = ${coreResultId}
                  AND rtr.initiative_id = ${coreInitId}
                  AND tr2.inititiative_id = ${coreInitId}
                  AND tr2.is_active = 1
          );
      `;

      const aaOutcome: any[] = await this.query(aa_query, [
        coreResultId,
        coreInitId,
        resultByInnovationPackageId,
        user,
      ]);

      return aaOutcome;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultIpAAOutcomeRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
