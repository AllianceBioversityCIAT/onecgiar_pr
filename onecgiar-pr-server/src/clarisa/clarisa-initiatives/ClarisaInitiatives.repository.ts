import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaInitiative } from './entities/clarisa-initiative.entity';
import { OstTocIdDto } from './dto/ost-toc-id.dto';
import { env } from 'process';

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
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllInitiatives() {
    try {
      return this.find();
    } catch (error) {
      throw {
        message: `[${ClarisaInitiativesRepository.name}] => getAllInitiatives error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getTocIdFromOst() {
    const queryData = `
    select 
    ibs.initiativeId,
    t.initvStgId,
    t.toc_id
    from ${env.DB_OST}.tocs t
    left join ${env.DB_OST}.initiatives_by_stages ibs
        on t.initvStgId = ibs.id
       where t.active > 0
        and t.type = 1
      order by ibs.initiativeId;
    `;
    try {
      const tocid: OstTocIdDto[] = await this.query(queryData);
      return tocid;
    } catch (error) {
      throw {
        message: `[${ClarisaInitiativesRepository.name}] => getTocIdFromOst error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllInitiativesWithoutCurrentInitiative(resultId: number) {
    const queryData = `
    select
      	DISTINCT 
      ci.id,
      	ci.official_code,
      	ci.name,
      	ci.short_name,
      	ci.active,
      	ci.action_area_id,
      	ci.toc_id
      from
      	clarisa_initiatives ci
      where
      	ci.id not in (
      	SELECT
      		DISTINCT rbi2.inititiative_id
      	FROM
      		results_by_inititiative rbi2
      	where
      		rbi2.result_id = ?
      		and rbi2.initiative_role_id = 1);
    `;
    try {
      const initiative: ClarisaInitiative[] = await this.query(queryData, [
        resultId,
      ]);
      return initiative;
    } catch (error) {
      throw {
        message: `[${ClarisaInitiativesRepository.name}] => getTocIdFromOst error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
