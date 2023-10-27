import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaInnovationReadinessLevel } from './entities/clarisa-innovation-readiness-level.entity';

@Injectable()
export class ClarisaInnovationReadinessLevelRepository extends Repository<ClarisaInnovationReadinessLevel> {
  constructor(private dataSource: DataSource) {
    super(ClarisaInnovationReadinessLevel, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_innovation_readiness_level;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaInnovationReadinessLevelRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
