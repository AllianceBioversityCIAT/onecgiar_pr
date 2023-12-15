import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { NonPooledProjectBudget } from '../entities/non_pooled_proyect_budget.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class NonPooledProjectBudgetRepository
  extends Repository<NonPooledProjectBudget>
  implements LogicalDelete<NonPooledProjectBudget>
{
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(NonPooledProjectBudget, dataSource.createEntityManager());
  }

  logicalDelete(resultId: number): Promise<NonPooledProjectBudget> {
    const queryData = `update  non_pooled_projetct_budget nppb
    inner join non_pooled_project npp on npp.id = nppb.non_pooled_projetct_id 
    set nppb.is_active = 0
    where npp.results_id = ?`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: NonPooledProjectBudgetRepository.name,
          debug: true,
        }),
      );
  }
  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete nppb from non_pooled_projetct_budget nppb
    inner join non_pooled_project npp on npp.id = nppb.non_pooled_projetct_id 
    where npp.results_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: NonPooledProjectBudgetRepository.name,
          debug: true,
        }),
      );
  }
}
