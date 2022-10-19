import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaGlobalTarget } from './entities/clarisa-global-target.entity';

@Injectable()
export class ClarisaGobalTargetRepository extends Repository<ClarisaGlobalTarget> {
  constructor(private dataSource: DataSource) {
    super(ClarisaGlobalTarget, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_global_targets;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaGobalTargetRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
