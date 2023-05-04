import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultInitiativeBudget } from '../entities/result_initiative_budget.entity';

@Injectable()
export class ResultInitiativeBudgetRepository extends Repository<ResultInitiativeBudget> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultInitiativeBudget, dataSource.createEntityManager());
  }
}
