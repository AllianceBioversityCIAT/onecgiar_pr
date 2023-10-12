import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaInnovationType } from './entities/clarisa-innovation-type.entity';

@Injectable()
export class ClarisaInnovationTypeRepository extends Repository<ClarisaInnovationType> {
  constructor(private dataSource: DataSource) {
    super(ClarisaInnovationType, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_innovation_type;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaInnovationTypeRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
