import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsIpActor } from './entities/results-ip-actor.entity';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../shared/globalInterfaces/replicable.interface';
import { BaseRepository } from '../../../shared/extendsGlobalDTO/base-repository';
import { predeterminedDateValidation } from '../../../shared/utils/versioning.utils';

@Injectable()
export class ResultsIpActorRepository
  extends BaseRepository<ResultsIpActor>
  implements LogicalDelete<ResultsIpActor>
{
  createQueries(
    config: ReplicableConfigInterface<ResultsIpActor>,
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
          women,
          women_youth,
          men,
          men_youth,
          ${config.new_ipsr_id} AS result_ip_result_id,
          actor_type_id,
          evidence_link,
          other_actor_type,
          sex_and_age_disaggregation,
          how_many
      FROM
          result_ip_result_actors
      WHERE
          result_ip_result_id = ${config.old_ipsr_id}
          AND is_active > 0;
      `,
      insertQuery: `
      INSERT INTO
          result_ip_result_actors (
              is_active,
              created_date,
              last_updated_date,
              created_by,
              last_updated_by,
              women,
              women_youth,
              men,
              men_youth,
              result_ip_result_id,
              actor_type_id,
              evidence_link,
              other_actor_type,
              sex_and_age_disaggregation,
              how_many
          )
      SELECT
          is_active,
          ${predeterminedDateValidation(
            config.predetermined_date,
          )} AS created_date,
          last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          women,
          women_youth,
          men,
          men_youth,
          ${config.new_ipsr_id} AS result_ip_result_id,
          actor_type_id,
          evidence_link,
          other_actor_type,
          sex_and_age_disaggregation,
          how_many
      FROM
          result_ip_result_actors
      WHERE
          result_ip_result_id = ${config.old_ipsr_id}
          AND is_active > 0;
      `,
      returnQuery: `
      SELECT
          result_ip_actors_id
      FROM
          result_ip_result_actors
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
    super(ResultsIpActor, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete rira from result_ip_result_actors rira 
    inner join result_by_innovation_package rbip on rbip.result_by_innovation_package_id = rira.result_ip_result_id
    where rbip.result_innovation_package_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsIpActorRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultsIpActor> {
    const dataQuery = `update result_ip_result_actors rira 
    inner join result_by_innovation_package rbip on rbip.result_by_innovation_package_id = rira.result_ip_result_id
    set rira.is_active = 0
    where rira.is_active > 0
      and rbip.result_innovation_package_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsIpActorRepository.name,
          debug: true,
        }),
      );
  }
}
