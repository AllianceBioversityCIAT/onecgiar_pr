import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaInitiative } from './entities/clarisa-initiative.entity';


@Injectable()
export class ClarisaInitiativesRepository extends Repository<ClarisaInitiative> {
  constructor(private dataSource: DataSource) {
    super(ClarisaInitiative, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_initiatives;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaInitiativesRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

}
