import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { REPORTING_EXCLUDED_INSTITUTION_IDS } from '../clarisa-reporting-exclusions.constant';
import { ClarisaCenter } from './entities/clarisa-center.entity';
import { ClarisaCenterDto } from './dto/clarisa-center.dto';
import {
  formatUnknownError,
  throwServiceError,
} from '../../shared/utils/service-error.util';

@Injectable()
export class ClarisaCentersRepository extends Repository<ClarisaCenter> {
  constructor(private readonly dataSource: DataSource) {
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
      throwServiceError(
        `[${ClarisaCentersRepository.name}] => deleteAllData error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
        and ci.is_active > 0
        and cc.institutionId not in (${REPORTING_EXCLUDED_INSTITUTION_IDS.join(',')});
    `;
    try {
      const centers: ClarisaCenterDto[] = await this.query(queryData);
      return centers;
    } catch (error) {
      throwServiceError(
        `[${ClarisaCentersRepository.name}] => deleteAllData error: ${formatUnknownError(error)}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
