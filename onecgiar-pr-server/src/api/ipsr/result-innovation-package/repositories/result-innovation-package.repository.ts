import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultInnovationPackage } from '../entities/result-innovation-package.entity';

@Injectable()
export class ResultInnovationPackageRepository extends Repository<ResultInnovationPackage> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultInnovationPackage, dataSource.createEntityManager());
  }
}
