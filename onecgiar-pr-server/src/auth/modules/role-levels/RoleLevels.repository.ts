import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { RoleLevel } from './entities/role-level.entity';

@Injectable()
export class RoleLevelRepository extends Repository<RoleLevel> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(RoleLevel, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM role_levels;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: RoleLevelRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
