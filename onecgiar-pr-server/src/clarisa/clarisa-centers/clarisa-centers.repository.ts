import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaCenter } from './entities/clarisa-center.entity';
import { ClarisaCenterDto } from './dto/clarisa-center.dto';

@Injectable()
export class ClarisaCentersRepository extends Repository<ClarisaCenter> {
  constructor(private dataSource: DataSource) {
    super(ClarisaCenter, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_center;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaCentersRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllCenters() {
    const queryData = `
      select 
      cc.code,
      cc.financial_code,
      cc.institutionId,
      ci.name,
      ci.acronym 
      from clarisa_center cc
      inner join clarisa_institutions ci on ci.id  = cc.institutionId
        and ci.is_active > 0;
    `;
    try {
      const centers: ClarisaCenterDto[] = await this.query(queryData);
      return centers;
    } catch (error) {
      throw {
        message: `[${ClarisaCentersRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
