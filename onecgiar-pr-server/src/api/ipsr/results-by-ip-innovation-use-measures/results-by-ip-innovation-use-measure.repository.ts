import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsByIpInnovationUseMeasure } from './entities/results-by-ip-innovation-use-measure.entity';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultsByIpInnovationUseMeasureRepository
  extends Repository<ResultsByIpInnovationUseMeasure>
  implements LogicalDelete<ResultsByIpInnovationUseMeasure>
{
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultsByIpInnovationUseMeasure, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const query = `delete rirm from result_ip_result_measures rirm 
    inner join result_ip_measure rim on rim.result_ip_measure_id = rirm.result_ip_result_id 
    where rim.result_id = ?;`;
    return this.query(query, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsByIpInnovationUseMeasureRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultsByIpInnovationUseMeasure> {
    const query = `update result_ip_result_measures rirm 
    inner join result_ip_measure rim on rim.result_ip_measure_id = rirm.result_ip_result_id 
    set rirm.is_active = 0
    where rirm.is_active > 0
      and rim.result_id = ?;`;
    return this.query(query, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsByIpInnovationUseMeasureRepository.name,
          debug: true,
        }),
      );
  }
}
