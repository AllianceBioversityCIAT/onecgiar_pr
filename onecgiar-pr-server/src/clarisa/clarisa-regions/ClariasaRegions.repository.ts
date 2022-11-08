import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaRegion } from './entities/clarisa-region.entity';

@Injectable()
export class ClarisaRegionsRepository extends Repository<ClarisaRegion> {
  constructor(private dataSource: DataSource) {
    super(ClarisaRegion, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_regions;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaRegionsRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllRegions() {
    const queryData = `
    select 
   	cr.um49Code as id,
   	cr.name,
   	cr.parent_regions_code 
   	from clarisa_regions cr;
    `;
    try {
      const regions = await this.query(queryData);
      return regions;
    } catch (error) {
      throw {
        message: `[${ClarisaRegionsRepository.name}] => getAllRegions error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllNoParentRegions() {
    const queryData = `
    select 
   	cr.um49Code as id,
   	cr.name,
   	cr.parent_regions_code 
   	from clarisa_regions cr
   	where  cr.parent_regions_code is not null;
    `;
    try {
      const regions = await this.query(queryData);
      return regions;
    } catch (error) {
      throw {
        message: `[${ClarisaRegionsRepository.name}] => getAllRegions error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
