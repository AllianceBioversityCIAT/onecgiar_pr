import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaMeliaStudyType } from './entities/clarisa-melia-study-type.entity';

@Injectable()
export class ClarisaMeliaStudyTypeRepository extends Repository<ClarisaMeliaStudyType> {
  constructor(private dataSource: DataSource) {
    super(ClarisaMeliaStudyType, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_melia_study_type;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaMeliaStudyTypeRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
