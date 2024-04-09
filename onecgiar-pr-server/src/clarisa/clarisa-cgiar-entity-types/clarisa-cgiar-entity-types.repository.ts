import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaCgiarEntityType } from './entities/clarisa-cgiar-entity-type.entity';
import { ReturnResponseUtil } from '../../shared/utils/response.util';

@Injectable()
export class ClarisaCgiarEntityTypeRepository extends Repository<ClarisaCgiarEntityType> {
  constructor(private dataSource: DataSource) {
    super(ClarisaCgiarEntityType, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_cgiar_entity_types;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw ReturnResponseUtil.format({
        message: `[${ClarisaCgiarEntityTypeRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }
}
