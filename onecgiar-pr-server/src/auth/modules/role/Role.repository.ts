import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { Role } from './entities/role.entity';

@Injectable()
export class RoleRepository extends Repository<Role> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(Role, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM role;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: RoleRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAllRoles() {
    const queryData = `
    select 
    	r.id ,
    	r.description ,
    	r.active ,
    	r.role_level_id,
      r.updated_by ,
      r.created_at ,
      r.updated_at 
    from \`role\` r
    where r.active > 0
    `;
    try {
      const roles: Role[] = await this.query(queryData);
      return roles;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: RoleRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
