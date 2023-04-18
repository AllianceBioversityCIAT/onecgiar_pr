import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultIpAAOutcome } from '../entities/result-ip-action-area-outcome.entity';
import { env } from 'process';

@Injectable()
export class ResultIpAAOutcomeRepository extends Repository<ResultIpAAOutcome> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultIpAAOutcome, dataSource.createEntityManager());
  }

  async mapActionAreaOutcome(
    initId: number
  ) {
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
            tr.toc_internal_id
          FROM
            prdb.toc_result tr
          WHERE
            tr.inititiative_id = ?
            AND tr.is_active = 1
        );
      `;

      const aaOutcome: any[] = await this.dataSource.query(aaOutcomeQuery, [initId]);
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
    `;

    try {
      const aaOutcome: any[] = await this.query(query, [resultByInnovationPackageId]);
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
