import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultIpMeasure } from './entities/result-ip-measure.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultIpMeasureRepository
  extends Repository<ResultIpMeasure>
  implements LogicalDelete<ResultIpMeasure>
{
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultIpMeasure, dataSource.createEntityManager());
  }

  logicalDelete(resultId: number): Promise<ResultIpMeasure> {
    const dataQuery = `update result_ip_measure rim set rim.is_active = 0 where rim.result_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultIpMeasureRepository.name,
          debug: true,
        }),
      );
  }
}
