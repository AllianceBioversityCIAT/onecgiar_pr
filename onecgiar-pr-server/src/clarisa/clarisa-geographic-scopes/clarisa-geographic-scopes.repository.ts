import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaGeographicScope } from './entities/clarisa-geographic-scope.entity';

@Injectable()
export class ClarisaGeographicScopeRepository extends Repository<ClarisaGeographicScope> {
  constructor(private dataSource: DataSource) {
    super(ClarisaGeographicScope, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_geographic_scope;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaGeographicScopeRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllScopes() {
    const queryData = `
    select 
    cgs.id,
    cgs.name,
    cgs.description 
    from clarisa_geographic_scope cgs;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaGeographicScopeRepository.name}] => getAllScopes error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
  async getAllPRMSScopes(dataDefault: number[] = [1, 2, 3]) {
    dataDefault = dataDefault ?? [1, 2, 3];
    const queryData = `
    select 
    cgs.id,
    cgs.name,
    cgs.description 
    from clarisa_geographic_scope cgs
      where cgs.id  in (${dataDefault.toString()});
    `;
    try {
      const scopes: ClarisaGeographicScope[] = await this.query(queryData);
      scopes.map((el) => {
        if (el.id == 3) {
          el.name = 'Country';
        }
      });
      return scopes;
    } catch (error) {
      throw {
        message: `[${ClarisaGeographicScopeRepository.name}] => getAllPRMSScopes error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
