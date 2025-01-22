import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultTocSdgTargets } from '../entities/result-toc-sdg-target.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultsTocSdgTargetRepository
  extends Repository<ResultTocSdgTargets>
  implements LogicalDelete<ResultTocSdgTargets>
{
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultTocSdgTargets, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete rtrt from result_toc_sdg_targets rtrt 
    inner join results_toc_result rtr on rtr.result_toc_result_id = rtrt.result_toc_result_id 
  where rtr.results_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsTocSdgTargetRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultTocSdgTargets> {
    const queryData = `update result_toc_sdg_targets rtrt 
    inner join results_toc_result rtr on rtr.result_toc_result_id = rtrt.result_toc_result_id 
  set rtrt.is_active = 0
  where rtr.results_id = ?
    and rtrt.is_active > 0;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsTocSdgTargetRepository.name,
          debug: true,
        }),
      );
  }
}
