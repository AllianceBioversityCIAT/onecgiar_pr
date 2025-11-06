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

  async findResultsByProjectsByResultId(resultId: number) {
    try {
      return await this.find({
        relations: { obj_clarisa_project: true },
        where: {
          result_id: resultId,
          is_active: true,
          obj_result_project: { is_active: true },
        },
      });
    } catch (error) {
      this._handlersError.returnErrorRepository({
        className: ResultsByProjectsRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
