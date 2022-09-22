import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaRegionType } from '../region-types/entities/clarisa-region-type.entity';


@Injectable()
export class ClarisaRegionsTypesRepository extends Repository<ClarisaRegionType> {
  constructor(private dataSource: DataSource) {
    super(ClarisaRegionType, dataSource.createEntityManager());
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
        message: `[${ClarisaRegionsTypesRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

}
