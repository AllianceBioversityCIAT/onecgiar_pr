import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { InnovationPackagingExpert } from '../entities/innovation-packaging-expert.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';
import { predeterminedDateValidation } from '../../../../shared/utils/versioning.utils';

@Injectable()
export class InnovationPackagingExpertRepository
  extends BaseRepository<InnovationPackagingExpert>
  implements LogicalDelete<InnovationPackagingExpert>
{
  createQueries(
    config: ReplicableConfigInterface<InnovationPackagingExpert>,
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
          result_ip_expert_id,
          first_name,
          last_name,
          email,
          organization_id,
          expertises_id,
          result_id
      FROM
          result_ip_expert
      WHERE
          result_id = ${config.old_result_id}
          AND is_active > 0;
      `,
      insertQuery: `
      INSERT INTO
          result_ip_expert (
              is_active,
              created_date,
              last_updated_date,
              created_by,
              last_updated_by,
              first_name,
              last_name,
              email,
              organization_id,
              expertises_id,
              result_id
          )
      SELECT
          is_active,
          ${predeterminedDateValidation(
            config.predetermined_date,
          )} AS created_date,
          last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          first_name,
          last_name,
          email,
          organization_id,
          expertises_id,
          ${config.new_result_id} AS result_id
      FROM
          result_ip_expert
      WHERE
          result_id = ${config.old_result_id}
          AND is_active > 0;
      `,
      returnQuery: `
      SELECT
          result_ip_expert_id
      FROM
          result_ip_expert
      WHERE
          result_id = ${config.new_result_id}
          AND is_active > 0;
      `,
    };
  }

  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(InnovationPackagingExpert, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete ipe from result_ip_expert ipe where ipe.result_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: InnovationPackagingExpertRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<InnovationPackagingExpert> {
    const dataQuery = `update result_ip_expert ipe set ipe.is_active = 0 where ipe.result_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: InnovationPackagingExpertRepository.name,
          debug: true,
        }),
      );
  }
}
