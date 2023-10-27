import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaPolicyType } from './entities/clarisa-policy-type.entity';

@Injectable()
export class ClarisaPolicyTypeRepository extends Repository<ClarisaPolicyType> {
  constructor(private dataSource: DataSource) {
    super(ClarisaPolicyType, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_policy_type;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaPolicyTypeRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
