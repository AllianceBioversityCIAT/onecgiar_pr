import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaInstitutionsType } from './entities/clarisa-institutions-type.entity';

@Injectable()
export class ClarisaInstitutionsTypeRepository extends Repository<ClarisaInstitutionsType> {
  constructor(private dataSource: DataSource) {
    super(ClarisaInstitutionsType, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_institution_types;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaInstitutionsTypeRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getInstitutionsType() {
    const queryData = `
    select 
    cit.code as institutions_types_id,
    cit.name as institutions_types_name
    from clarisa_institution_types cit;
    `;
    try {
      const institutionsType = await this.query(queryData);
      return institutionsType;
    } catch (error) {
      throw {
        message: `[${ClarisaInstitutionsTypeRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  
  async getValidInstitutionType(id: number[]) {
    let values = '';
    for (let index = 0; index < id.length; index++) {
      if(!values){
        values = `values row(${id[index]})`
      }else{
        values += `, row(${id[index]})`
      }
      
    }
    const queryData = `
    select 
    	rl.column_0 as institution_id, 
    	if(dt.code is null, false, true) as valid
    from (${values}) rl
    	left join (select 
    				ci.code 
    				from clarisa_institution_types ci 
    				where ci.code in(${id.toString()})) dt on dt.code = rl.column_0;
    `;
    
    try {
      const InstitutionsType = await this.query(queryData);
      return InstitutionsType;
    } catch (error) {
      throw {
        message: `[${ClarisaInstitutionsTypeRepository.name}] => getValidInstitution error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}