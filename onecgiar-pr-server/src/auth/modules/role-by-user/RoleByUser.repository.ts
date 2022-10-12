import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RoleByUser } from './entities/role-by-user.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { getSpecificRoleDto } from './dto/getSpecificRole.dto';

@Injectable()
export class RoleByUserRepository extends Repository<RoleByUser> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(RoleByUser, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM role_by_user;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: RoleByUserRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAllRolesByUser(userId: number) {
    const queryData = `
    select  
    	r.id as role_id,
    	rl.id as role_level_id,
    	rl.name as role_level_name,
    	r.description,
    	rbu.initiative_id,
    	rbu.action_area_id
    from role_by_user rbu 
    	inner join \`role\` r on r.id = rbu.\`role\` 
    						and r.active > 0
    	inner join role_levels rl on rl.id = r.role_level_id 
    where rbu.\`user\` = ?
    `;
    try {
      const deleteData = await this.query(queryData, [userId]);
      return deleteData;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: RoleByUserRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getSpecificRole(config: getSpecificRoleDto) {
    const queryData = `
    select  
    	r.id as role_id,
    	rl.id as role_level_id,
    	rl.name as role_level_name,
    	r.description,
    	rbu.initiative_id,
    	rbu.action_area_id
    from role_by_user rbu 
    	inner join \`role\` r on r.id = rbu.\`role\` 
    						and r.active > 0
    	inner join role_levels rl on rl.id = r.role_level_id 
    where rbu.\`user\` = ?
      and rbu.\`role\` = ?
      and rbu.initiative_id = ?
    	or rbu.action_area_id = ?
    `;
    try {
      const getSpecificRole = await this.query(queryData, [
        config.user,
        config.role,
        config.initiative_id,
        config.action_area_id,
      ]);
      console.log(getSpecificRole);
      console.log(config);
      return getSpecificRole[0];
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: RoleByUserRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
