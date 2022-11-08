import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaActionAreaOutcome } from './entities/clarisa-action-area-outcome.entity';

@Injectable()
export class ClarisaActionAreaOutcomeRepository extends Repository<ClarisaActionAreaOutcome> {
  constructor(private dataSource: DataSource) {
    super(ClarisaActionAreaOutcome, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_action_area_outcome;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaActionAreaOutcomeRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
