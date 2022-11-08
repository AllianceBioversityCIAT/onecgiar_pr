import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaInitiative } from './entities/clarisa-initiative.entity';
import { OstTocIdDto } from './dto/ost-toc-id.dto';

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

  async getTocIdFromOst() {
    const queryData = `
    select 
    ibs.initiativeId,
    t.initvStgId,
    t.toc_id
    from submissiontooldb.tocs t
    left join submissiontooldb.initiatives_by_stages ibs
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
}