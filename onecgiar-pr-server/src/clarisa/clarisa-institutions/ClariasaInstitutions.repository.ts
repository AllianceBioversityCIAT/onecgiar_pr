import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaInstitution } from './entities/clarisa-institution.entity';

@Injectable()
export class ClarisaInstitutionsRepository extends Repository<ClarisaInstitution> {
  constructor(private dataSource: DataSource) {
    super(ClarisaInstitution, dataSource.createEntityManager());
  }

  async getMostRecentLastUpdated() {
    const query = `
    select
      cast(
        truncate(
          unix_timestamp(
            max(ci.last_updated_date)
          ), 3
        ) * 1000 as unsigned integer
      ) as most_recent
    from
      clarisa_institutions ci
    order by
      ci.last_updated_date
    `;
    try {
      const queryResult = this.query(query);
      return queryResult;
    } catch (error) {
      throw {
        message: `[${ClarisaInstitutionsRepository.name}] => getMostRecentLastUpdated error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
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
    	ci.id as institutions_id,
    	ci.name institutions_name,
    	ci.acronym as institutions_acronym,
      ci.website_link,
    	cit.code as institutions_type_id, 
    	cit.name as institutions_type_name,
      cc.name as  headquarter_name
    from clarisa_institutions ci 
    inner join clarisa_institution_types cit on cit.code = ci.institution_type_code
    left join clarisa_countries cc on cc.iso_alpha_2 = ci.headquarter_country_iso2 
    where 
    ci.is_active > 0;
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

  async getValidInstitution(institutions: institutionsInterface[]) {
    const id = institutions.map((el) => el.institutions_id);
    let values = '';
    for (let index = 0; index < id.length; index++) {
      if (!values) {
        values = `values row(${id[index]})`;
      } else {
        values += `, row(${id[index]})`;
      }
    }
    const queryData = `
    select 
    	rl.column_0 as institution_id, 
    	if(dt.id is null, false, true) as valid
    from (${values}) rl
    	left join (select 
    				ci.id 
    				from clarisa_institutions ci 
    				where ci.id in(${id.toString()})) dt on dt.id = rl.column_0;
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
  institutions_id: number;
}
