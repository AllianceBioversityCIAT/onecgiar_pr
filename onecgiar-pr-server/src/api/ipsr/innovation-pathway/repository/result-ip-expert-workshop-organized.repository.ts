import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultIpExpertWorkshopOrganized } from '../entities/result-ip-expert-workshop-organized.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';
import { predeterminedDateValidation } from '../../../../shared/utils/versioning.utils';

@Injectable()
export class ResultIpExpertWorkshopOrganizedRepostory
  extends BaseRepository<ResultIpExpertWorkshopOrganized>
  implements LogicalDelete<ResultIpExpertWorkshopOrganized>
{
  createQueries(
    config: ReplicableConfigInterface<ResultIpExpertWorkshopOrganized>,
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
          ${config.new_result_id} AS result_id,
          first_name,
          last_name,
          email,
          workshop_role
      FROM
          result_ip_expert_workshop_organized
      WHERE
          result_id = ${config.old_result_id}
          AND is_active > 0;
      `,
      insertQuery: `
      INSERT INTO
          result_ip_expert_workshop_organized (
              is_active,
              created_date,
              last_updated_date,
              created_by,
              last_updated_by,
              result_id,
              first_name,
              last_name,
              email,
              workshop_role
          )
      SELECT
          is_active,
          ${predeterminedDateValidation(
            config.predetermined_date,
          )} AS created_date,
          last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          ${config.new_result_id} AS result_id,
          first_name,
          last_name,
          email,
          workshop_role
      FROM
          result_ip_expert_workshop_organized
      WHERE
          result_id = ${config.old_result_id}
          AND is_active > 0;
      `,
      returnQuery: `
      SELECT
          result_ip_expert_workshop_organized_id
      FROM
          result_ip_expert_workshop_organized
      WHERE
          result_id = ${config.new_ipsr_id}
          AND is_active > 0;
      `,
    };
  }
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultIpExpertWorkshopOrganized, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete riewo from result_ip_expert_workshop_organized riewo where riewo.result_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultIpExpertWorkshopOrganizedRepostory.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultIpExpertWorkshopOrganized> {
    const dataQuery = `update result_ip_expert_workshop_organized riewo set riewo.is_active = 0 where riewo.result_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultIpExpertWorkshopOrganizedRepostory.name,
          debug: true,
        }),
      );
  }
}
