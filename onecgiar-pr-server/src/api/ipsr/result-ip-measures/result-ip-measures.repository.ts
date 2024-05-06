import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ResultIpMeasure } from './entities/result-ip-measure.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';
import { ConfigCustomQueryInterface, ReplicableConfigInterface } from '../../../shared/globalInterfaces/replicable.interface';
import { predeterminedDateValidation } from '../../../shared/utils/versioning.utils';
import { BaseRepository } from '../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class ResultIpMeasureRepository
  extends BaseRepository<ResultIpMeasure>
  implements LogicalDelete<ResultIpMeasure>
{

  createQueries(
    config: ReplicableConfigInterface<ResultIpMeasure>,
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
          ${config.new_ipsr_id} AS result_ip_id,
          quantity,
          ${config.new_result_id} AS result_id
      FROM
          result_ip_measure
      WHERE
          result_id = ${config.old_result_id}
          AND is_active > 0;
      `,
      insertQuery: `
      INSERT INTO
          result_ip_measure (
              is_active,
              created_date,
              last_updated_date,
              created_by,
              last_updated_by,
              unit_of_measure,
              result_ip_id,
              quantity,
              result_id
          )
      SELECT
          is_active,
          ${predeterminedDateValidation(config.predetermined_date)} AS created_date,
          last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          unit_of_measure,
          ${config.new_result_id} AS result_ip_id,
          quantity,
          ${config.new_result_id} AS result_id
      FROM
          result_ip_measure
      WHERE
          result_id = ${config.old_result_id}
          AND is_active > 0;
      `,
      returnQuery: `
      SELECT
        result_ip_measure_id
      FROM
          result_ip_measure
      WHERE
          result_id = ${config.new_result_id};
      `,
    }
  }

  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultIpMeasure, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete rim from result_ip_measure rim where rim.result_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultIpMeasureRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultIpMeasure> {
    const dataQuery = `update result_ip_measure rim set rim.is_active = 0 where rim.result_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultIpMeasureRepository.name,
          debug: true,
        }),
      );
  }
}
