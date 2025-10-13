import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsByProjects } from './entities/results_by_projects.entity';

@Injectable()
export class ResultsByProjectsRepository extends Repository<ResultsByProjects> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsByProjects, dataSource.createEntityManager());
  }
}
