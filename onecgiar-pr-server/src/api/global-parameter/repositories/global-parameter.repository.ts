import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';

import { VERSIONING } from '../../../shared/utils/versioning.utils';
import { GlobalParameter } from '../entities/global-parameter.entity';

@Injectable()
export class GlobalParameterRepository extends Repository<GlobalParameter> {
  private readonly _logger: Logger = new Logger(GlobalParameterRepository.name);

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(GlobalParameter, dataSource.createEntityManager());
  }

  async findOneByName(name: string) {
    const queryData = `
    SELECT gp.name, gp.value, gp.description, gpc.name AS categoryName, gp.global_parameter_category_id as categoryId
    FROM global_parameters gp
    LEFT JOIN global_parameter_categories gpc ON gp.global_parameter_category_id = gpc.id
    WHERE gp.name = ?;
    `;
    try {
      const globalParameter = await this.query(queryData, [name]);
      return globalParameter;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: GlobalParameterRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
