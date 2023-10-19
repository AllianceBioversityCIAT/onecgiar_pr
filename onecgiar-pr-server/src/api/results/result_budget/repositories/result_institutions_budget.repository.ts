import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultInstitutionsBudget } from '../entities/result_institutions_budget.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultInstitutionsBudgetRepository
  extends Repository<ResultInstitutionsBudget>
  implements LogicalDelete<ResultInstitutionsBudget>
{
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultInstitutionsBudget, dataSource.createEntityManager());
  }
  logicalDelete(resultId: number): Promise<ResultInstitutionsBudget> {
    const queryData = `delete rib from result_institutions_budget rib 
    inner join results_by_institution rbi on rbi.id = rib.result_institution_id 
    where rbi.result_id = ?`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultInstitutionsBudgetRepository.name,
          debug: true,
        }),
      );
  }
  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `update result_institutions_budget rib 
    inner join results_by_institution rbi on rbi.id = rib.result_institution_id 
    set rib.is_active = 0
    where rbi.result_id = ?`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultInstitutionsBudgetRepository.name,
          debug: true,
        }),
      );
  }
}
