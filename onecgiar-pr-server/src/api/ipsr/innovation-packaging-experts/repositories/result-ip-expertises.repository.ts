import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultIpExpertises } from '../entities/result_ip_expertises.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';
import { predeterminedDateValidation } from '../../../../shared/utils/versioning.utils';

@Injectable()
export class ResultIpExpertisesRepository
  extends BaseRepository<ResultIpExpertises>
  implements LogicalDelete<ResultIpExpertises>
{
  createQueries(
    config: ReplicableConfigInterface<ResultIpExpertises>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      SELECT
          rie.is_active,
          ${predeterminedDateValidation(
            config.predetermined_date,
          )} AS created_date,
          rie.last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          re2.result_ip_expert_id AS result_ip_expert_id,
          rie.expertises_id
      FROM
          result_ip_expertises rie
          LEFT JOIN result_ip_expert re1 ON re1.result_ip_expert_id = rie.result_ip_expert_id
          LEFT JOIN result_ip_expert re2 ON re2.organization_id = re1.organization_id
          AND re2.result_id = ${config.new_result_id}
      WHERE
          re1.result_id = ${config.old_result_id}
          AND re1.is_active = 1
          AND rie.is_active = 1;
      `,
      insertQuery: `
      INSERT INTO
        result_ip_expertises (
            is_active,
            created_date,
            last_updated_date,
            created_by,
            last_updated_by,
            result_ip_expert_id,
            expertises_id
        )
        SELECT
            rie3.is_active,
            ${predeterminedDateValidation(
              config.predetermined_date,
            )} AS created_date,
            rie3.last_updated_date,
            ${config.user.id} AS created_by,
            ${config.user.id} AS last_updated_by,
            rie3.result_ip_expert_id AS result_ip_expert_id,
            rie2.expertises_id
        FROM 
            result_ip_expert rie 
            LEFT JOIN result_ip_expertises rie2 ON rie2.result_ip_expert_id = rie.result_ip_expert_id
            LEFT JOIN result r ON r.id = rie.result_id 
            AND r.is_active = 1
            LEFT JOIN result r2 ON r2.result_code = r.result_code
            LEFT JOIN result_ip_expert rie3 ON rie3.result_id = r2.id
          WHERE 
            r.id = ${config.old_result_id}
            AND r2.id = ${config.new_result_id}
            AND rie.is_active = 1
            AND rie2.is_active = 1;
      `,
      returnQuery: `
      SELECT
          rie.result_ip_expertises_id
      FROM
          result_ip_expertises rie
          LEFT JOIN result_ip_expert re1 ON re1.result_ip_expert_id = rie.result_ip_expert_id
      WHERE
          re1.result_id = ${config.new_result_id}
          AND re1.is_active = 1
          AND rie.is_active = 1;
      `,
    };
  }

  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultIpExpertises, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete rie from result_ip_expertises rie 
                            inner join result_ip_expert rip on rip.result_ip_expert_id = rie.result_ip_expert_id
                        where rip.result_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultIpExpertisesRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultIpExpertises> {
    const dataQuery = `update result_ip_expertises rie 
                            inner join result_ip_expert rip on rip.result_ip_expert_id = rie.result_ip_expert_id 
                        set rie.is_active = 0
                        where rie.is_active > 0
                         and rip.result_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultIpExpertisesRepository.name,
          debug: true,
        }),
      );
  }
}
