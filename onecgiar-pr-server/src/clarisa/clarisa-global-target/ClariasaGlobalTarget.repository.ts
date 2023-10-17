import { Injectable, HttpStatus } from '@nestjs/common';
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

  async getAllGlobalTarget() {
    const queryData = `
    SELECT
    	cgt.target,
    	cgt.targetId,
      (
        SELECT 
          cia.name
        FROM 
          clarisa_impact_areas cia
        WHERE cia.id = cgt.impactAreaId
      ) AS name,
    	cgt.impactAreaId
    FROM
    	clarisa_global_targets cgt;
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
