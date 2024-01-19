import { Injectable, HttpStatus } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaCountry } from './entities/clarisa-country.entity';

@Injectable()
export class ClarisaCountriesRepository extends Repository<ClarisaCountry> {
  constructor(private dataSource: DataSource) {
    super(ClarisaCountry, dataSource.createEntityManager());
  }

  async deleteAllData() {
    const queryData = `
    DELETE FROM clarisa_countries;
    `;
    try {
      const deleteData = await this.query(queryData);
      return deleteData;
    } catch (error) {
      throw {
        message: `[${ClarisaCountriesRepository.name}] => deleteAllData error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }

  async getAllCountries() {
    const queryData = `
    select 
    cc.id,
    cc.name,
    cc.iso_alpha_2,
    cc.iso_alpha_3
    from clarisa_countries cc 
    order by cc.name asc;
    `;
    try {
      const countries = await this.query(queryData);
      return countries;
    } catch (error) {
      throw {
        message: `[${ClarisaCountriesRepository.name}] => getAllCountries error: ${error}`,
        response: {},
        status: HttpStatus.INTERNAL_SERVER_ERROR,
      };
    }
  }
}
