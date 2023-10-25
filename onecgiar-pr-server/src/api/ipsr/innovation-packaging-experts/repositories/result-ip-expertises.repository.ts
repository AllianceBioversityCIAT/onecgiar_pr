import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultIpExpertises } from '../entities/result_ip_expertises.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultIpExpertisesRepository
  extends Repository<ResultIpExpertises>
  implements LogicalDelete<ResultIpExpertises>
{
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultIpExpertises, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete rie from result_ip_expertises rie 
                            inner join result_ip_expert rip on rip.result_ip_expert_id = rie.result_ip_expert_id
                        where rip.result_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultIpExpertisesRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultIpExpertises> {
    const dataQuery = `update result_ip_expertises rie 
                            inner join result_ip_expert rip on rip.result_ip_expert_id = rie.result_ip_expert_id 
                        set rie.is_active = 0
                        where rie.is_active > 0
                         and rip.result_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultIpExpertisesRepository.name,
          debug: true,
        }),
      );
  }
}
