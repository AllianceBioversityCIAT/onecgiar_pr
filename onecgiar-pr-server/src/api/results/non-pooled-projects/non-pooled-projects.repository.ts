import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { NonPooledProject } from './entities/non-pooled-project.entity';

@Injectable()
export class NonPooledProjectRepository extends Repository<NonPooledProject> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(NonPooledProject, dataSource.createEntityManager());
  }

  async getTocByResult() {
    const queryData = `
    
    `;
    try {
      const version: NonPooledProject[] = await this.query(queryData);
      return version;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: NonPooledProjectRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
