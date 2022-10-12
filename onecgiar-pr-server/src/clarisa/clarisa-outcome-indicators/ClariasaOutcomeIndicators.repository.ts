import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaOutcomeIndicator } from './entities/clarisa-outcome-indicator.entity';

@Injectable()
export class ClarisaOutcomeIndicatorsRepository extends Repository<ClarisaOutcomeIndicator> {
  constructor(private dataSource: DataSource) {
    super(ClarisaOutcomeIndicator, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_outcome_indicators;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaOutcomeIndicatorsRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
