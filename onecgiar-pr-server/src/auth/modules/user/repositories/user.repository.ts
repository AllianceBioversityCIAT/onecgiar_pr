import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { FullUserRequestDto } from '../dto/full-user-request.dto';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(private dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async completeDataByEmail(email: string) {
    const queryData = `
    SELECT  u.id,
            u.first_name, 
            u.last_name ,
            u.email, 
            cdu.password, 
            cdu.is_cgiar , 
            u.active  
    FROM users u 
	    INNER JOIN complementary_data_users cdu ON cdu.user_id = u.id 
    WHERE u.active > 0
	    AND u.email = ?
    `;
    try {
      const completeUser: FullUserRequestDto[] = await this.query(queryData, [
        email,
      ]);
      return completeUser[0];
    } catch (error) {
      return 'error';
    }
  }

  async completeAllData() {
    const queryData = `
    SELECT  u.id,
            u.first_name, 
            u.last_name ,
            u.email, 
            cdu.is_cgiar , 
            u.active  
    FROM users u 
	    INNER JOIN complementary_data_users cdu ON cdu.user_id = u.id 
    WHERE u.active > 0
    `;
    try {
      const completeUser: FullUserRequestDto[] = await this.query(queryData);
      return completeUser;
    } catch (error) {
      throw new HttpException(
        {message: `completeAllData error: ${error}`,
        response: {}},
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
