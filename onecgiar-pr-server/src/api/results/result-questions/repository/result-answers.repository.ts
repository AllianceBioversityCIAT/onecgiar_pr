import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultAnswer } from '../entities/result-answers.entity';

@Injectable()
export class ResultAnswerRepository extends Repository<ResultAnswer> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultAnswer, dataSource.createEntityManager());
  }
}