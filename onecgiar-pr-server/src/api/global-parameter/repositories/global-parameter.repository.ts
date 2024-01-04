import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
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

  async getPlatformGlobalVariables() {
    const queryData = `
    SELECT 
    CASE 
        WHEN LOCATE('pgv_', gp.name) = 1 THEN SUBSTRING(gp.name, 5)
        ELSE gp.name
    END AS name, 
    value,
    gp.description
    FROM 
        global_parameters gp
    LEFT JOIN 
        global_parameter_categories gpc ON gp.global_parameter_category_id = gpc.id
    WHERE 
        gpc.name = 'platform_global_variables';
    `;
    try {
      const globalParameter = await this.query(queryData);
      return globalParameter;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: GlobalParameterRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getCurrentDateText() {
    const queryData = `SELECT DATE_FORMAT(CONVERT_TZ(now(), '+00:00', '+02:00'), '%Y%m%d%H%i') as dateText`;
    try {
      return await this.query(queryData);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: GlobalParameterRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
