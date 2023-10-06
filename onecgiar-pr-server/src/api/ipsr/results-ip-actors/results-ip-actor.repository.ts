import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsIpActor } from './entities/results-ip-actor.entity';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultsIpActorRepository
  extends Repository<ResultsIpActor>
  implements LogicalDelete<ResultsIpActor>
{
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultsIpActor, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete rira from result_ip_result_actors rira 
    inner join result_by_innovation_package rbip on rbip.result_by_innovation_package_id = rira.result_ip_result_id
    where rbip.result_innovation_package_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsIpActorRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultsIpActor> {
    const dataQuery = `update result_ip_result_actors rira 
    inner join result_by_innovation_package rbip on rbip.result_by_innovation_package_id = rira.result_ip_result_id
    set rira.is_active = 0
    where rira.is_active > 0
      and rbip.result_innovation_package_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsIpActorRepository.name,
          debug: true,
        }),
      );
  }
}
