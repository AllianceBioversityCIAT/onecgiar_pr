import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsByIpInnovationUseMeasure } from './entities/results-by-ip-innovation-use-measure.entity';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../shared/globalInterfaces/replicable.interface';
import { BaseRepository } from '../../../shared/extendsGlobalDTO/base-repository';
import { predeterminedDateValidation } from '../../../shared/utils/versioning.utils';

@Injectable()
export class ResultsByIpInnovationUseMeasureRepository
  extends BaseRepository<ResultsByIpInnovationUseMeasure>
  implements LogicalDelete<ResultsByIpInnovationUseMeasure>
{
  createQueries(
    config: ReplicableConfigInterface<ResultsByIpInnovationUseMeasure>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      SELECT
          is_active,
          ${predeterminedDateValidation(config.predetermined_date)} AS created_date,
          last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          unit_of_measure,
          quantity,
          ${config.new_ipsr_id} result_ip_result_id,
          evidence_link
      FROM
          result_ip_result_measures
      WHERE
          result_ip_result_id = ${config.old_ipsr_id}
          AND is_active > 0;
      `,
      insertQuery: `
      INSERT INTO
          result_ip_result_measures (
              is_active,
              created_date,
              last_updated_date,
              created_by,
              last_updated_by,
              unit_of_measure,
              quantity,
              result_ip_result_id,
              evidence_link
          )
      SELECT
          is_active,
          ${predeterminedDateValidation(config.predetermined_date)} AS created_date,
          last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          unit_of_measure,
          quantity,
          ${config.new_ipsr_id} result_ip_result_id,
          evidence_link
      FROM
          result_ip_result_measures
      WHERE
          result_ip_result_id = ${config.old_ipsr_id}
          AND is_active > 0;
      `,
      returnQuery: `
      SELECT
          result_ip_result_measures_id
      FROM
          result_ip_result_measures
      WHERE
          result_ip_result_id = ${config.new_ipsr_id}
          AND is_active > 0;
      `,
    };
  }
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultsByIpInnovationUseMeasure, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const query = `delete rirm from result_ip_result_measures rirm 
    inner join result_ip_measure rim on rim.result_ip_measure_id = rirm.result_ip_result_id 
    where rim.result_id = ?;`;
    return this.query(query, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsByIpInnovationUseMeasureRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultsByIpInnovationUseMeasure> {
    const query = `update result_ip_result_measures rirm 
    inner join result_ip_measure rim on rim.result_ip_measure_id = rirm.result_ip_result_id 
    set rirm.is_active = 0
    where rirm.is_active > 0
      and rim.result_id = ?;`;
    return this.query(query, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsByIpInnovationUseMeasureRepository.name,
          debug: true,
        }),
      );
  }
}
