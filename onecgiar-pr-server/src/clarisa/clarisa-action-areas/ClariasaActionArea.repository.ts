import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaActionArea } from './entities/clarisa-action-area.entity';

@Injectable()
export class ClariasaActionAreaRepository extends Repository<ClarisaActionArea> {
  constructor(private dataSource: DataSource) {
    super(ClarisaActionArea, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_action_area;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClariasaActionAreaRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
