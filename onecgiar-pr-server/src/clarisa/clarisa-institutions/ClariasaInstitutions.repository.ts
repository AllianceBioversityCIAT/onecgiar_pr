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
      SELECT
        ci.id AS institutions_id,
        ci.name AS institutions_name,
        ci.acronym AS institutions_acronym,
        ci.website_link,
        cit.code AS institutions_type_id,
        cit.name AS institutions_type_name,
        cco.name AS headquarter_name,
        IF(cce.code IS NULL, 0, 1) AS is_center
      FROM clarisa_institutions ci
      INNER JOIN clarisa_institution_types cit ON cit.code = ci.institution_type_code
      LEFT JOIN clarisa_countries cco ON cco.iso_alpha_2 = ci.headquarter_country_iso2
      LEFT JOIN clarisa_center cce ON ci.id = cce.institutionId
      WHERE ci.is_active > 0;
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
