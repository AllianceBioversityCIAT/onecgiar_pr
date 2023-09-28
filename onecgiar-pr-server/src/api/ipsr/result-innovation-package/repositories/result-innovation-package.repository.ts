import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultInnovationPackage } from '../entities/result-innovation-package.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultInnovationPackageRepository
  extends Repository<ResultInnovationPackage>
  implements LogicalDelete<ResultInnovationPackage>
{
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultInnovationPackage, dataSource.createEntityManager());
  }

  logicalDelete(resultId: number): Promise<ResultInnovationPackage> {
    const dataQuery = `update result_innovation_package rip set rip.is_active = 0 where rip.result_innovation_package_id = ?;`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultInnovationPackageRepository.name,
          debug: true,
        }),
      );
  }
}
