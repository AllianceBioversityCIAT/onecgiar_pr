import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { FullUserRequestDto } from '../dto/full-user-request.dto';
import { HandlersError } from '../../../../shared/handlers/error.utils';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(User, dataSource.createEntityManager());
  }

  async AllUsersByEmail(email: string) {
    const queryData = `
    SELECT  u.id,
            u.first_name, 
            u.last_name ,
            u.email, 
            cdu.password, 
            cdu.is_cgiar , 
            u.active  
    FROM users u
    WHERE u.active > 0
	    AND u.email = ?
    `;
    try {
      const completeUser: FullUserRequestDto[] = await this.query(queryData, [
        email,
      ]);
      return completeUser[0];
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: UserRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getUserByEmail(email: string) {
    const queryData = `
    SELECT
    	u.id,
    	u.first_name,
    	u.last_name,
    	u.email,
    	u.is_cgiar,
    	u.password,
    	u.last_login,
    	u.active,
    	u.created_date,
    	u.created_by,
    	u.last_updated_date,
    	u.last_updated_by
    FROM
    	users u
    WHERE
    	u.active > 0
    	and u.email = ?
    `;
    try {
      const completeUser: User[] = await this.query(queryData, [
        email,
      ]);
      return completeUser?.length? completeUser[0]: undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: UserRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateLastLoginUserByEmail(email: string) {
    const queryData = `
    UPDATE users 
    	set last_login = NOW()
    WHERE email = ?
    	and active > 0;
    `;
    try {
      const completeUser: User[] = await this.query(queryData, [
        email,
      ]);
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: UserRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async AllUsers() {
    const queryData = `
    SELECT  u.id,
            u.first_name, 
            u.last_name ,
            u.email, 
            u.is_cgiar , 
            u.active  
    FROM users u
    WHERE u.active > 0
    `;
    try {
      const completeUser: FullUserRequestDto[] = await this.query(queryData);
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: UserRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getUserById(userId: number) {
    const queryData = `
    SELECT  u.id,
            u.first_name, 
            u.last_name ,
            u.email, 
            u.is_cgiar , 
            u.active  
    FROM users u
    WHERE u.active > 0
      and u.id = ?
    `;
    try {
      const completeUser: FullUserRequestDto[] = await this.query(queryData, [userId]);
      return completeUser?.length?completeUser[0]: undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: UserRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async InitiativeByUser(userId: number) {
    const queryData = `
    select 
    	ci.id as initiative_id,
    	ci.official_code,
    	ci.name as initiative_name,
      ci.short_name
    from role_by_user rbu 
    	inner join clarisa_initiatives ci on ci.id = rbu.initiative_id 
    									and ci.active > 0
    where rbu.\`user\` = ?;
    `;
    try {
      const completeUser: any[] = await this.query(queryData, [userId]);
      return completeUser;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: UserRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async isUserInInitiative(userId: number, resultId: number) {
    const queryData = `
    select 
      if(COUNT(u.id) > 0, 1, 0) as valid
    from users u
      inner join role_by_user rbu on rbu.\`user\` = u.id 
      inner JOIN results_by_inititiative rbi ON rbi.inititiative_id = rbu.initiative_id 
    where rbi.result_id = ?
      and u.id = ?
    `;
    try {
      const completeUser: any[] = await this.query(queryData, [userId, resultId]);
      return completeUser?.length? (completeUser[0].valid == 1? true: false) : false;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: UserRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
