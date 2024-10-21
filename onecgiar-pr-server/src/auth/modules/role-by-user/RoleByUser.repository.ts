import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RoleByUser } from './entities/role-by-user.entity';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { getSpecificRoleDto } from './dto/getSpecificRole.dto';
import { RoleTypeEnum } from '../../../shared/constants/role-type.enum';

@Injectable()
export class RoleByUserRepository extends Repository<RoleByUser> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(RoleByUser, dataSource.createEntityManager());
  }

  async isUserAdmin(userId: number): Promise<boolean> {
    const queryData = `
    SELECT
      if(rbu.role = 1, 1, 0) as is_admin
    from
      role_by_user rbu
    WHERE
      rbu.user = ?
      and rbu.initiative_id is null
      and rbu.action_area_id is null
      and rbu.active > 0;
    `;
    try {
      const isAdmin = await this.query(queryData, [userId]);
      if (isAdmin?.length > 0) {
        return Boolean(isAdmin[0].is_admin);
      }

      return null;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: RoleByUserRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  $_getMaxRoleByUser(userId: number) {
    const queryData = `
    SELECT
      MIN(rbu.role) max_role
    FROM
      role_by_user rbu
    WHERE
      rbu.user = ?
      AND rbu.active > 0
      AND rbu.initiative_id IS NULL
      AND rbu.action_area_id IS NULL
    LIMIT
      1;
	`;
    const res = this.query(queryData, [userId]);

    return res
      .then((data) => {
        return data?.length ? data[0].max_role : null;
      })
      .catch((_error) => null);
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
      and rbu.active > 0;
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
      and rbu.active > 0;
    `;
    try {
      const getSpecificRole = await this.query(queryData, [
        config.user,
        config.role,
        config.initiative_id,
        config.action_area_id,
      ]);
      return getSpecificRole[0];
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: RoleByUserRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async validationRolePermissions(
    userId: number,
    resultId: number,
    rolesToValidate: number[],
  ) {
    const queryData = `
    SELECT
	    CASE
	    	when ((
	    	SELECT
	    		rbu.\`role\`
	    	FROM
	    		users u
	    	left join role_by_user rbu on
	    		rbu.\`user\` = u.id
	    	WHERE
	    		u.active > 0
	    		and u.id = ?
	    		and rbu.action_area_id is NULL
	    		and rbu.initiative_id is null
        order by rbu.\`role\` asc
	    	LIMIT 1) = 1) then true
	    	else CASE 
	    		WHEN ((
	    		SELECT
	    			rbu.\`role\`
	    		FROM
	    			users u
	    		left join role_by_user rbu on
	    			rbu.\`user\` = u.id
	    		WHERE
	    			u.active > 0
	    			and u.id = ?
	    			and rbu.initiative_id = (
	    			SELECT
	    				rbi.inititiative_id
	    			from
	    				results_by_inititiative rbi
	    			where
	    				rbi.result_id = ?
	    				and rbi.initiative_role_id = 1)) in (${
                rolesToValidate?.toString() || 'NAN'
              })) THEN TRUE
	    		else false
	    	END
	    END as validation;
    `;
    try {
      const getSpecificRole: Array<{ validation: string }> = await this.query(
        queryData,
        [userId, userId, resultId],
      );
      return getSpecificRole?.length
        ? parseInt(getSpecificRole[0].validation)
        : 0;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: RoleByUserRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async $_isValidRole(
    userId: number,
    type: RoleTypeEnum = RoleTypeEnum.APPLICATION,
  ): Promise<number> {
    const query = `
    select 
    min(ubr.role) max_role  
  from role_by_user ubr 
  where ubr.user = ? 
    and ubr.active = true
    and ubr.initiative_id is ${
      type == RoleTypeEnum.INITIATIVE ? 'not' : ''
    } NULL 
    and ubr.action_area_id is ${
      type == RoleTypeEnum.ACTION_AREA ? 'not' : ''
    } NULL
    or (ubr.\`role\` = 1 and ubr.user = ?)
  group by ubr.user;
    `;
    const result: { max_role: number }[] = await this.query(query, [
      userId,
      userId,
    ]);
    return result?.length ? result[0].max_role : null;
  }
}
