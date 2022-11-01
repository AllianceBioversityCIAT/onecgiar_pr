import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultCountry } from './entities/result-country.entity';

@Injectable()
export class ResultCountryRepository extends Repository<ResultCountry> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultCountry, dataSource.createEntityManager());
  }

  async getAllResultCountries(){
    const query = `
    select 
    rc.result_country_id,
    rc.is_active,
    rc.result_id,
    rc.country_id,
    rc.created_date,
    rc.last_updated_date 
    from result_country rc 
    where rc.is_active > 0;
    `;

    try {
      const result: ResultCountry[] = await this.query(query);
      return result;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultCountryRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultCountriesByResultId(resultId: number){
    const query = `
    select 
    rc.result_country_id,
    rc.is_active,
    rc.result_id,
    rc.country_id,
    rc.created_date,
    rc.last_updated_date,
    cc.name 
    from result_country rc 
    inner join clarisa_countries cc on cc.id = rc.country_id 
    where rc.is_active > 0
      and rc.result_id = ?;
    `;

    try {
      const result: ResultCountry[] = await this.query(query, [resultId]);
      return result;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultCountryRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultCountrieByIdResultAndCountryId(resultId: number, countryId: number){
    const query = `
    select 
    rc.result_country_id,
    rc.is_active,
    rc.result_id,
    rc.country_id,
    rc.created_date,
    rc.last_updated_date 
    from result_country rc 
    where rc.is_active > 0
      and rc.result_id = ?
      and rc.country_id = ?;
    `;

    try {
      const result: ResultCountry[] = await this.query(query, [resultId, countryId]);
      return result?.length?result[0]:undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultCountryRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateCountries(resultId: number, countriesArray: number[]) {
    const Countries = countriesArray??[];
    const upDateInactive = `
    update result_country  
    set is_active = 0, 
    	 last_updated_date = NOW()
    where is_active > 0 
    	and result_id  = ?
    	and country_id  not in (${Countries.toString()});
    `;

    const upDateActive = `
    update result_country  
    set is_active = 1, 
    	 last_updated_date = NOW()
    where result_id  = ?
    	and country_id in (${Countries.toString()});
    `;

    const upDateAllInactive = `
    update result_country  
    set is_active = 0, 
    	 last_updated_date = NOW()
    where result_id = ?;
    `;

    try {
      if(Countries?.length){
        const upDateInactiveResult = await this.query(upDateInactive, [
          resultId
        ]);
  
        return await this.query(upDateActive, [
          resultId
        ]);
      }else{
        return await this.query(upDateAllInactive, [
          resultId
        ]);
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultCountryRepository.name,
        error: `updateCountries ${error}`,
        debug: true,
      });
    }
  }
}