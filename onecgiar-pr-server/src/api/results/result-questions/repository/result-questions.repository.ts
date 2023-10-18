import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultQuestion } from '../entities/result-question.entity';

@Injectable()
export class ResultQuestionsRepository extends Repository<ResultQuestion> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultQuestion, dataSource.createEntityManager());
  }

  async innovationDev() {
    try {
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultQuestionsRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
