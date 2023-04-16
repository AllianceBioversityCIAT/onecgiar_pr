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

  async getInitiativeBudget(resultInitiativeBudgetId: number) {
    const initBudgetQuery = `
      SELECT 
        rib.*,
        rbi.inititiative_id
      FROM
        result_initiative_budget rib
        LEFT JOIN results_by_inititiative rbi ON rbi.id = rib.result_initiative_id
      WHERE rib.result_initiative_budget_id = ?
        AND rbi.is_active = 1
    `;
    try {
      const initBudget = await this.query(initBudgetQuery, [resultInitiativeBudgetId]);
      return initBudget;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultInitiativeBudget.name,
        error: error,
        debug: true,
      });
    }
  }
}
