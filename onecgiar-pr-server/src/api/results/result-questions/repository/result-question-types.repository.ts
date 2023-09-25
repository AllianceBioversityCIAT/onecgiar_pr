import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultQuestionType } from '../entities/result-question-types.entity';

@Injectable()
export class ResultQuestionTypesRepository extends Repository<ResultQuestionType> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultQuestionType, dataSource.createEntityManager());
  }
}