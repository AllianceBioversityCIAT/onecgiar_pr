import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaPolicyStage } from './entities/clarisa-policy-stage.entity';

@Injectable()
export class ClarisaPolicyStageRepository extends Repository<ClarisaPolicyStage> {
  constructor(private dataSource: DataSource) {
    super(ClarisaPolicyStage, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_policy_stage;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaPolicyStageRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
