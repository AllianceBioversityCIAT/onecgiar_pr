import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultInstitutionsBudget } from '../entities/result_institutions_budget.entity';

@Injectable()
export class ResultInstitutionsBudgetRepository extends Repository<ResultInstitutionsBudget> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultInstitutionsBudget, dataSource.createEntityManager());
  }
}
