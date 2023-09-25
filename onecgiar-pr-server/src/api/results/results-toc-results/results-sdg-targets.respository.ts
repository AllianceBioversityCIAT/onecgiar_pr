import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsTocResultIndicators } from './entities/results-toc-results-indicators.entity';
import { ResultTocImpactArea } from './entities/result-toc-impact-area-target.entity';
import { ResultTocSdgTargets } from './entities/result-toc-sdg-target.entity';
import { ResultSdgTargets } from './entities/results-sdg-targets.entity';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultsSdgTargetRepository
  extends Repository<ResultSdgTargets>
  implements LogicalDelete<ResultSdgTargets>
{
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultSdgTargets, dataSource.createEntityManager());
  }

  logicalDelete(resultId: number): Promise<ResultSdgTargets> {
    const queryData = `update results_sdg_targets rst set rst.is_active = 0 where rst.result_id = ? and rst.is_active > 0;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsSdgTargetRepository.name,
          debug: true,
        }),
      );
  }
}
