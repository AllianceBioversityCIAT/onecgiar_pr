import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsTocResultIndicators } from './entities/results-toc-results-indicators.entity';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultsTocResultIndicatorsRepository
  extends Repository<ResultsTocResultIndicators>
  implements LogicalDelete<ResultsTocResultIndicators>
{
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsTocResultIndicators, dataSource.createEntityManager());
  }

  logicalDelete(resultId: number): Promise<ResultsTocResultIndicators> {
    const queryData = `update results_toc_result_indicators rtri 
    inner join results_toc_result rtr on rtr.result_toc_result_id = rtri.results_toc_results_id 
  set rtri.is_active = 0
  where rtr.results_id = ?
    and rtri.is_active > 0;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsTocResultIndicatorsRepository.name,
          debug: true,
        }),
      );
  }
}
