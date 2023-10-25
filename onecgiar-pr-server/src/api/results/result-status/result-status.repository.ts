import { HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultStatus } from './entities/result-status.entity';

@Injectable()
export class ResultStatusRepository extends Repository<ResultStatus> {
  constructor(private dataSource: DataSource) {
    super(ResultStatus, dataSource.createEntityManager());
  }

  async getAllStatuses() {
    const queryData = `
    select 
    rs.result_status_id AS status_id,
    rs.status_name AS name
    from result_status rs 
    `;
    try {
      const status = await this.query(queryData);
      return status;
    } catch (error) {
      throw {
        message: `[${ResultStatusRepository.name}] => getAllStatus error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
