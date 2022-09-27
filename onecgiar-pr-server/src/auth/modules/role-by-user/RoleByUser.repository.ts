import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { RoleByUser } from './entities/role-by-user.entity';


@Injectable()
export class RoleByUserRepository extends Repository<RoleByUser> {
  constructor(private dataSource: DataSource) {
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
      throw {
        message: `[${RoleByUserRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

}
