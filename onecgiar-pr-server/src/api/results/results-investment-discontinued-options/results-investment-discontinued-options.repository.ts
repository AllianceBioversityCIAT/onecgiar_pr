import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsInvestmentDiscontinuedOption } from './entities/results-investment-discontinued-option.entity';

@Injectable()
export class ResultsInvestmentDiscontinuedOptionRepository extends Repository<ResultsInvestmentDiscontinuedOption> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(
      ResultsInvestmentDiscontinuedOption,
      dataSource.createEntityManager(),
    );
  }

  async inactiveData(options: number[], result_id: number, user_id: number) {
    const changeActive = (
      active: boolean,
    ) => `update results_investment_discontinued_options  
    set is_active = ${active ? `1` : `0`}, 
    	last_updated_date = NOW(), 
    	last_updated_by = ? 
    where is_active > 0 
    	and result_id = ?
    	${
        options.length
          ? `and investment_discontinued_option_id  ${
              active ? `` : `not`
            } in (${options.toString()})`
          : ``
      }`;
    try {
      await this.dataSource.query(changeActive(false), [user_id, result_id]);
      if (options.length) {
        await this.dataSource.query(changeActive(true), [user_id, result_id]);
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInvestmentDiscontinuedOptionRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
