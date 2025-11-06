import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../shared/handlers/error.utils';
import { ClarisaProject } from './entity/clarisa-projects.entity';

@Injectable()
export class ClarisaProjectsRepository extends Repository<ClarisaProject> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ClarisaProject, dataSource.createEntityManager());
  }
}
