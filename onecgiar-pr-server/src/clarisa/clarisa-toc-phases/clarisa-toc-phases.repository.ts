import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaTocPhase } from './entities/clarisa-toc-phase.entity';

@Injectable()
export class ClarisaTocPhaseRepository extends Repository<ClarisaTocPhase> {
  constructor(private dataSource: DataSource) {
    super(ClarisaTocPhase, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
      DELETE FROM clarisa_toc_phase 
        `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaTocPhaseRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
