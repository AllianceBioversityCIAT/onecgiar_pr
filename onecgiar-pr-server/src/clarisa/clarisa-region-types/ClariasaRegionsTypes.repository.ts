import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaRegionType } from './entities/clarisa-region-type.entity';


@Injectable()
export class ClarisaRegionsTypeRepository extends Repository<ClarisaRegionType> {
  constructor(private dataSource: DataSource) {
    super(ClarisaRegionType, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_regions_types;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaRegionsTypeRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

}
