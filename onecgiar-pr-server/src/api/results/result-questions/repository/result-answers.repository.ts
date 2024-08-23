import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultAnswer } from '../entities/result-answers.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';
import { predeterminedDateValidation } from '../../../../shared/utils/versioning.utils';

@Injectable()
export class ResultAnswerRepository
  extends BaseRepository<ResultAnswer>
  implements LogicalDelete<ResultAnswer>
{
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultAnswer, dataSource.createEntityManager());
  }

  createQueries(
    config: ReplicableConfigInterface<ResultAnswer>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
        SELECT
            is_active,
            ${predeterminedDateValidation(config.predetermined_date)} AS created_date,
            last_updated_date,
            ${config.user.id} AS created_by,
            ${config.user.id} AS last_updated_by,
            ${config.new_result_id} AS result_id,
            result_question_id,
            answer_text,
            answer_boolean
        FROM
            result_answers
        WHERE
            result_id = ${config.old_result_id}
            AND is_active > 0;
      `,
      insertQuery: `
        INSERT INTO
            result_answers (
                is_active,
                created_date,
                last_updated_date,
                created_by,
                last_updated_by,
                result_id,
                result_question_id,
                answer_text,
                answer_boolean
            )
        SELECT
            is_active,
            ${predeterminedDateValidation(config.predetermined_date)} AS created_date,
            last_updated_date,
            ${config.user.id} AS created_by,
            ${config.user.id} AS last_updated_by,
            ${config.new_result_id} AS result_id,
            result_question_id,
            answer_text,
            answer_boolean
        FROM
            result_answers
        WHERE
            result_id = ${config.old_result_id}
            AND is_active = 1;
      `,
      returnQuery: `
        SELECT
            *
        FROM
            result_answers
        WHERE
            result_id = ${config.new_result_id};
      `,
    };
  }

  fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete ra from result_answers ra where ra.result_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultAnswerRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultAnswer> {
    const dataQuery = `update result_answers ra set ra.is_active = 0 where ra.result_id = ? and ra.is_active > 0;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultAnswerRepository.name,
          debug: true,
        }),
      );
  }
}
