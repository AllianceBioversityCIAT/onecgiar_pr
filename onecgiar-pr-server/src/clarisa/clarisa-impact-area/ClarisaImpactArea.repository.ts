import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaImpactArea } from './entities/clarisa-impact-area.entity';

@Injectable()
export class ClarisaImpactAreaRepository extends Repository<ClarisaImpactArea> {
  constructor(private dataSource: DataSource) {
    super(ClarisaImpactArea, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_impact_areas;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaImpactAreaRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
