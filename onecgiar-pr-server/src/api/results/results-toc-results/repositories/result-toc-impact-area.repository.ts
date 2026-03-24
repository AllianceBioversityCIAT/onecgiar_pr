import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultTocImpactArea } from '../entities/result-toc-impact-area-target.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultsTocImpactAreaTargetRepository
  extends Repository<ResultTocImpactArea>
  implements LogicalDelete<ResultTocImpactArea>
{
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultTocImpactArea, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete rtiat from result_toc_impact_area_target rtiat
    inner join results_toc_result rtr ON rtr.result_toc_result_id = rtiat.result_toc_result_id 
  where rtr.results_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsTocImpactAreaTargetRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultTocImpactArea> {
    const queryData = `update result_toc_impact_area_target rtiat
      inner join results_toc_result rtr ON rtr.result_toc_result_id = rtiat.result_toc_result_id 
    set rtiat.is_active = 0
    where rtr.results_id = ?
      and rtiat.is_active > 0;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsTocImpactAreaTargetRepository.name,
          debug: true,
        }),
      );
  }
}
