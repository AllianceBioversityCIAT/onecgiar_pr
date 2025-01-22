import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultTocActionArea } from '../entities/result-toc-action-area.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultsActionAreaOutcomeRepository
  extends Repository<ResultTocActionArea>
  implements LogicalDelete<ResultTocActionArea>
{
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultTocActionArea, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete rtaa from result_toc_action_area rtaa
    inner join results_toc_result rtr ON rtr.result_toc_result_id = rtaa.result_toc_result_id 
  where rtr.results_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsActionAreaOutcomeRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultTocActionArea> {
    const queryData = `update result_toc_action_area rtaa
    inner join results_toc_result rtr ON rtr.result_toc_result_id = rtaa.result_toc_result_id 
  set rtaa.is_active = 0
  where rtr.results_id = ?
    and rtaa.is_active > 0;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsActionAreaOutcomeRepository.name,
          debug: true,
        }),
      );
  }
}
