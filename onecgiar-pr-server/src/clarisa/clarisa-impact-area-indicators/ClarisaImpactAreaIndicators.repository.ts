import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaImpactAreaIndicator } from './entities/clarisa-impact-area-indicator.entity';

@Injectable()
export class ClarisaImpactAreaInticatorsRepository extends Repository<ClarisaImpactAreaIndicator> {
  constructor(private dataSource: DataSource) {
    super(ClarisaImpactAreaIndicator, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_impact_area_indicator;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaImpactAreaInticatorsRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
