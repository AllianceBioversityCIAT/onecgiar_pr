import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultFolderType } from '../entities/result-folder-type.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';

@Injectable()
export class ResultFolderTypeRepository extends Repository<ResultFolderType> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultFolderType, dataSource.createEntityManager());
  }
}
