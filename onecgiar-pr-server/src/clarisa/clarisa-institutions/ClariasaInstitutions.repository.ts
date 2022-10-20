import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaInstitution } from './entities/clarisa-institution.entity';

@Injectable()
export class ClarisaInstitutionsRepository extends Repository<ClarisaInstitution> {
  constructor(private dataSource: DataSource) {
    super(ClarisaInstitution, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_institutions;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaInstitutionsRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllInstitutions() {
    const queryData = `
    select 
    	ci.id,
    	ci.name,
    	ci.acronym,
    	ci.website_link,
    	ci.institution_type_code
    from clarisa_institutions ci;
    `;
    try {
      const deleteData: ClarisaInstitution[] = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaInstitutionsRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getValidInstitution(id: institutionsInterface[]) {
    let values = '';
    for (let index = 0; index < id.length; index++) {
      if (!values) {
        values = `values row(${id[index].institutions_id})`;
      } else {
        values += `, row(${id[index].institutions_id})`;
      }
    }
    const arrayId = id.map((i) => i.institutions_id);
    const queryData = `
    select 
    	rl.column_0 as institution_id, 
    	if(dt.id is null, false, true) as valid
    from (${values}) rl
    	left join (select 
    				ci.id 
    				from clarisa_institutions ci 
    				where ci.id in(${arrayId.toString()})) dt on dt.id = rl.column_0;
    `;

    try {
      const validInstitutions = await this.query(queryData);
      return validInstitutions;
    } catch (error) {
      throw {
        message: `[${ClarisaInstitutionsRepository.name}] => getValidInstitution error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}

interface institutionsInterface {
  id: number;
  institutions_id: number;
  is_active: boolean;
}
