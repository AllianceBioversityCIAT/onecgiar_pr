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
}
