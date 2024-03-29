import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { InnovationPackagingExpert } from '../entities/innovation-packaging-expert.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class InnovationPackagingExpertRepository
  extends Repository<InnovationPackagingExpert>
  implements LogicalDelete<InnovationPackagingExpert>
{
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(InnovationPackagingExpert, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete ipe from result_ip_expert ipe where ipe.result_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: InnovationPackagingExpertRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<InnovationPackagingExpert> {
    const dataQuery = `update result_ip_expert ipe set ipe.is_active = 0 where ipe.result_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: InnovationPackagingExpertRepository.name,
          debug: true,
        }),
      );
  }
}
