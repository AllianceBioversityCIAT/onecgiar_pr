import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultIndicatorTarget } from '../entities/result-toc-result-target-indicators.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultsTocTargetIndicatorRepository
  extends Repository<ResultIndicatorTarget>
  implements LogicalDelete<ResultIndicatorTarget>
{
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultIndicatorTarget, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete rit from result_indicators_targets rit
    inner join results_toc_result_indicators rtri on rtri.result_toc_result_indicator_id = rit.result_toc_result_indicator_id
    inner join results_toc_result rtr on rtr.result_toc_result_id = rtri.results_toc_results_id
  where rtr.results_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsTocTargetIndicatorRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultIndicatorTarget> {
    const queryData = `update result_indicators_targets rit
    inner join results_toc_result_indicators rtri on rtri.result_toc_result_indicator_id = rit.result_toc_result_indicator_id
    inner join results_toc_result rtr on rtr.result_toc_result_id = rtri.results_toc_results_id
  set rit.is_active = 0
  where rtr.results_id = ?
    and rit.is_active > 0;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsTocTargetIndicatorRepository.name,
          debug: true,
        }),
      );
  }
}
