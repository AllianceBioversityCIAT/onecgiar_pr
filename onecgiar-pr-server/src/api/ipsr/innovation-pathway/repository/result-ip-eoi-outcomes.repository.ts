import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultIpEoiOutcome } from '../entities/result-ip-eoi-outcome.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import { env } from 'process';
import {
  ReplicableConfigInterface,
  ConfigCustomQueryInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { predeterminedDateValidation } from '../../../../shared/utils/versioning.utils';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class ResultIpEoiOutcomeRepository
  extends BaseRepository<ResultIpEoiOutcome>
  implements LogicalDelete<ResultIpEoiOutcome>
{
  createQueries(
    config: ReplicableConfigInterface<ResultIpEoiOutcome>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      SELECT
          is_active,
          ${predeterminedDateValidation(
            config.predetermined_date,
          )} AS created_date,
          last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          ${config.new_ipsr_id} AS result_by_innovation_package_id,
          toc_result_id,
          contributing_toc
      FROM
          result_ip_eoi_outcomes
      WHERE
          result_by_innovation_package_id = ${config.old_ipsr_id} 
          AND is_active > 0;
      `,
      insertQuery: `
      INSERT INTO
        result_ip_eoi_outcomes (
            is_active,
            created_date,
            last_updated_date,
            created_by,
            last_updated_by,
            result_by_innovation_package_id,
            toc_result_id,
            contributing_toc
        )
        SELECT
            is_active,
            ${predeterminedDateValidation(
              config.predetermined_date,
            )} AS created_date,
            last_updated_date,
            ${config.user.id} AS created_by,
            ${config.user.id} AS last_updated_by,
            ${config.new_ipsr_id} AS result_by_innovation_package_id,
            toc_result_id,
            contributing_toc
        FROM
            result_ip_eoi_outcomes
        WHERE
            result_by_innovation_package_id = ${config.old_ipsr_id} 
            AND is_active > 0;
      `,
      returnQuery: `
      SELECT
          result_by_innovation_package_id
      FROM
          result_ip_eoi_outcomes
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
    super(ResultIpEoiOutcome, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete rieo from result_ip_eoi_outcomes rieo
    inner join result_by_innovation_package rbip on rbip.result_by_innovation_package_id = rieo.result_by_innovation_package_id  
    where rbip.result_innovation_package_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultIpEoiOutcomeRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultIpEoiOutcome> {
    const dataQuery = `update result_ip_eoi_outcomes rieo
    inner join result_by_innovation_package rbip on rbip.result_by_innovation_package_id = rieo.result_by_innovation_package_id  
    set rieo.is_active = 0
    where rieo.is_active > 0
        and rbip.result_innovation_package_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultIpEoiOutcomeRepository.name,
          debug: true,
        }),
      );
  }

  async getEoiOutcomes(resultByInnovationPackageId: number) {
    const query = `
    SELECT 
      rieo.toc_result_id,
      (
        SELECT
          tr.result_title 
        FROM ${env.DB_TOC}.toc_results tr 
        WHERE tr.id = rieo.toc_result_id
      ) AS title
    FROM
      result_ip_eoi_outcomes rieo
    WHERE rieo.is_active > 0
        AND result_by_innovation_package_id = ?
    `;

    try {
      const eoiOutcome: any[] = await this.query(query, [
        resultByInnovationPackageId,
      ]);
      return eoiOutcome;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultIpEoiOutcomeRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
