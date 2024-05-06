import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ResultActor } from '../entities/result-actor.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
  ReplicableInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { predeterminedDateValidation } from '../../../../shared/utils/versioning.utils';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class ResultActorRepository
  extends BaseRepository<ResultActor>
  implements ReplicableInterface<ResultActor>, LogicalDelete<ResultActor>
{
  createQueries(
    config: ReplicableConfigInterface<ResultActor>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      SELECT
          is_active,
          ${predeterminedDateValidation(config.predetermined_date)} AS created_date,
          last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          women,
          women_youth,
          men,
          men_youth,
          ${config.new_result_id} AS result_id,
          actor_type_id,
          other_actor_type,
          sex_and_age_disaggregation,
          how_many,
          has_women,
          has_women_youth,
          has_men,
          has_men_youth
      FROM
          result_actors
      WHERE
          result_id = ${config.old_result_id} 
          AND is_active > 0;
      `,
      insertQuery: `
      INSERT INTO
          result_actors (
              is_active,
              created_date,
              last_updated_date,
              created_by,
              last_updated_by,
              women,
              women_youth,
              men,
              men_youth,
              result_id,
              actor_type_id,
              other_actor_type,
              sex_and_age_disaggregation,
              how_many,
              has_women,
              has_women_youth,
              has_men,
              has_men_youth
          )
      SELECT
          is_active,
          ${predeterminedDateValidation(config.predetermined_date)} AS created_date,
          last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          women,
          women_youth,
          men,
          men_youth,
          ${config.new_result_id} AS result_id,
          actor_type_id,
          other_actor_type,
          sex_and_age_disaggregation,
          how_many,
          has_women,
          has_women_youth,
          has_men,
          has_men_youth
      FROM
          result_actors
      WHERE
          result_id = ${config.old_result_id} 
          AND is_active > 0;
      `,
      returnQuery: `
      SELECT
          result_actors_id
      FROM
          result_actors
        WHERE
          result_id = ${config.new_result_id} 
          AND is_active > 0;
      `,
    }
  }

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultActor, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete ra from \`result_actors\` ra where ra.result_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          className: ResultActorRepository.name,
          error: err,
          debug: true,
        }),
      );
  }
  private readonly _logger: Logger = new Logger(ResultActorRepository.name);

  logicalDelete(resultId: number): Promise<any> {
    const queryData = `UPDATE \`result_actors\` SET is_active = 0 WHERE result_id = ?`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          className: ResultActorRepository.name,
          error: err,
          debug: true,
        }),
      );
  }

  async replicable(
    config: ReplicableConfigInterface<ResultActor>,
  ): Promise<ResultActor[]> {
    let final_data: ResultActor[] = null;
    try {
      if (config.f?.custonFunction) {
        const queryData = `
        SELECT 
        ra.actor_type_id
        ,? as created_by
        ,${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date
        ,ra.has_men
        ,ra.has_men_youth
        ,ra.has_women
        ,ra.has_women_youth
        ,ra.how_many
        ,ra.is_active
        ,? as last_updated_by
        ,ra.last_updated_date
        ,ra.men
        ,ra.men_youth
        ,ra.other_actor_type
        ,? as result_id
        ,ra.sex_and_age_disaggregation
        ,ra.women
        ,ra.women_youth
         FROM result_actors ra WHERE ra.result_id = ? and ra.is_active > 0`;
        const response = await (<Promise<ResultActor[]>>(
          this.query(queryData, [
            config.user.id,
            config.user.id,
            config.new_result_id,
            config.old_result_id,
          ])
        ));
        const response_edit = <ResultActor[]>(
          config.f.custonFunction(response?.length ? response[0] : null)
        );
        final_data = await this.save(response_edit);
      } else {
        const queryData = `
        INSERT INTO result_actors (
          actor_type_id
          ,created_by
          ,created_date
          ,has_men
          ,has_men_youth
          ,has_women
          ,has_women_youth
          ,how_many
          ,is_active
          ,last_updated_by
          ,last_updated_date
          ,men
          ,men_youth
          ,other_actor_type
          ,result_id
          ,sex_and_age_disaggregation
          ,women
          ,women_youth
          )
          SELECT 
          ra.actor_type_id
          ,? as created_by
          ,${predeterminedDateValidation(
            config?.predetermined_date,
          )} as created_date
          ,ra.has_men
          ,ra.has_men_youth
          ,ra.has_women
          ,ra.has_women_youth
          ,ra.how_many
          ,ra.is_active
          ,? as last_updated_by
          ,ra.last_updated_date
          ,ra.men
          ,ra.men_youth
          ,ra.other_actor_type
          ,? as result_id
          ,ra.sex_and_age_disaggregation
          ,ra.women
          ,ra.women_youth
           FROM result_actors ra WHERE ra.result_id = ? and ra.is_active > 0`;
        await (<Promise<{ insertId }>>(
          this.query(queryData, [
            config.user.id,
            config.user.id,
            config.new_result_id,
            config.old_result_id,
          ])
        ));

        const queryFind = `
        SELECT 
        ra.actor_type_id
        ,ra.created_by
        ,ra.created_date
        ,ra.has_men
        ,ra.has_men_youth
        ,ra.has_women
        ,ra.has_women_youth
        ,ra.how_many
        ,ra.is_active
        ,ra.last_updated_by
        ,ra.last_updated_date
        ,ra.men
        ,ra.men_youth
        ,ra.other_actor_type
        ,ra.result_actors_id
        ,ra.result_id
        ,ra.sex_and_age_disaggregation
        ,ra.women
        ,ra.women_youth
         FROM result_actors ra WHERE ra.result_id = ? and ra.is_active > 0
        `;
        const temp = await (<Promise<ResultActor[]>>(
          this.query(queryFind, [config.new_result_id])
        ));
        final_data = temp;
      }
    } catch (error) {
      config.f?.errorFunction
        ? config.f.errorFunction(error)
        : this._logger.error(error);
      final_data = null;
    }

    config.f?.completeFunction?.({ ...final_data });
    return final_data;
  }
}
