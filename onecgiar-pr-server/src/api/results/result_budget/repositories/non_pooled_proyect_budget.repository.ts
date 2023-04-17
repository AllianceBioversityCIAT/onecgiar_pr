import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { NonPooledProjectBudget } from '../entities/non_pooled_proyect_budget.entity';

@Injectable()
export class NonPooledProjectBudgetRepository extends Repository<NonPooledProjectBudget> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(NonPooledProjectBudget, dataSource.createEntityManager());
  }
}
