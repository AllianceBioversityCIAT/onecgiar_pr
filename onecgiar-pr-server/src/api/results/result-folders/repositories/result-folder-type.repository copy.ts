import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultFolder } from '../entities/result-folder.entity';

@Injectable()
export class ResultFolderRepository extends Repository<ResultFolder> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultFolder, dataSource.createEntityManager());
  }
}
