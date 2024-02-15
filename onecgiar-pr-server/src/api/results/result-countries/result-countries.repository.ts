import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultCountry } from './entities/result-country.entity';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
  ReplicableInterface,
} from '../../../shared/globalInterfaces/replicable.interface';
import { predeterminedDateValidation } from '../../../shared/utils/versioning.utils';
import { BaseRepository } from '../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class ResultCountryRepository
  extends BaseRepository<ResultCountry>
  implements ReplicableInterface<ResultCountry>, LogicalDelete<ResultCountry>
{
  createQueries(
    config: ReplicableConfigInterface<ResultCountry>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      select 
      null as result_country_id,
      rc.is_active,
      ${config.new_result_id} as result_id,
      rc.country_id,
      ${predeterminedDateValidation(
        config?.predetermined_date,
      )} as created_date,
      now() as last_updated_date
      from result_country rc WHERE rc.result_id = ${
        config.old_result_id
      } and is_active > 0`,
      insertQuery: `
      insert into result_country (
        is_active,
        result_id,
        country_id,
        created_date,
        last_updated_date
        )
        select
        rc.is_active,
        ${config.new_result_id} as result_id,
        rc.country_id,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date,
        now() as last_updated_date
        from result_country rc WHERE rc.result_id = ${
          config.old_result_id
        } and is_active > 0;`,
      returnQuery: `
      select 
      rc.*
      from result_country rc WHERE rc.result_id = ${config.new_result_id}`,
    };
  }
  private readonly _logger: Logger = new Logger(ResultCountryRepository.name);
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultCountry, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete rc from result_country rc WHERE rc.result_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          className: ResultCountryRepository.name,
          error: err,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultCountry> {
    const queryData = `UPDATE \`result_country\` SET is_active = 0 WHERE result_id = ?`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          className: ResultCountryRepository.name,
          error: err,
          debug: true,
        }),
      );
  }

  async replicable(
    config: ReplicableConfigInterface<ResultCountry>,
  ): Promise<ResultCountry[]> {
    let final_data: ResultCountry[] = null;
    try {
      if (config.f?.custonFunction) {
        const queryData = `
        select 
        null as result_country_id,
        rc.is_active,
        ? as result_id,
        rc.country_id,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date,
        now() as last_updated_date
        from result_country rc WHERE rc.result_id = ? and is_active > 0`;
        const response = await (<Promise<ResultCountry[]>>(
          this.query(queryData, [config.new_result_id, config.old_result_id])
        ));
        const response_edit = <ResultCountry[]>(
          config.f.custonFunction(response)
        );
        final_data = await this.save(response_edit);
      } else {
        const queryData = `
        insert into result_country (
          is_active,
          result_id,
          country_id,
          created_date,
          last_updated_date
          )
          select
          rc.is_active,
          ? as result_id,
          rc.country_id,
          ${predeterminedDateValidation(
            config?.predetermined_date,
          )} as created_date,
          now() as last_updated_date
          from result_country rc WHERE rc.result_id = ? and is_active > 0;`;
        await this.query(queryData, [
          config.new_result_id,
          config.old_result_id,
        ]);
        const queryFind = `
        select 
        rc.result_country_id,
        rc.is_active,
        rc.result_id,
        rc.country_id,
        rc.created_date,
        rc.last_updated_date
        from result_country rc WHERE rc.result_id = ?`;
        final_data = await this.query(queryFind, [config.new_result_id]);
      }
    } catch (error) {
      config.f?.errorFunction
        ? config.f.errorFunction(error)
        : this._logger.error(error);
      final_data = null;
    }

    config.f?.completeFunction?.({ ...final_data });
    return final_data;
  }

  async getAllResultCountries() {
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
      const result: ResultCountry[] = await this.query(query, []);
      return result;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultCountryRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultCountriesByResultId(resultId: number) {
    const queryCountries = `
      select 
      rc.result_country_id,
      rc.is_active,
      rc.result_id,
      rc.country_id as id,
      rc.created_date,
      rc.last_updated_date,
      cc.name,
      cc.iso_alpha_2
      from result_country rc 
      inner join clarisa_countries cc on cc.id = rc.country_id 
      where rc.is_active > 0
        and rc.result_id = ?;
    `;

    const querySubnational = `
      select rc.result_country_id, rcs.result_country_subnational_id, css.*
      from result r
      left join result_country rc on rc.result_id = r.id and rc.is_active > 0
      right join result_country_subnational rcs on rcs.result_country_id = rc.result_country_id and rcs.is_active > 0
      left join clarisa_subnational_scopes css on css.code = rcs.clarisa_subnational_scope_code and css.is_active > 0
      where r.id = ?;
    `;

    try {
      const countries: ResultCountry[] = await this.query(queryCountries, [
        resultId,
      ]);
      const subnational: any[] = await this.query(querySubnational, [resultId]);
      countries.forEach((country) => {
        country['sub_national'] = subnational.filter(
          (s) => s.result_country_id == country.result_country_id,
        );
      });
      return countries;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultCountryRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultCountrieByIdResultAndCountryId(
    resultId: number,
    countryId: number,
  ) {
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
      const result: ResultCountry[] = await this.query(query, [
        resultId,
        countryId,
      ]);
      return result?.length ? result[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultCountryRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateCountries(resultId: number, countriesArray: number[]) {
    const countries = countriesArray ?? [];
    const upDateInactive = `
    update result_country  
    set is_active = 0, 
    	 last_updated_date = NOW()
    where is_active > 0 
    	and result_id  = ?
    	and country_id  not in (${countries.toString()});
    `;

    const upDateActive = `
    update result_country  
    set is_active = 1, 
    	 last_updated_date = NOW()
    where result_id  = ?
    	and country_id in (${countries.toString()});
    `;

    const upDateAllInactive = `
    update result_country  
    set is_active = 0, 
    	 last_updated_date = NOW()
    where result_id = ?;
    `;

    try {
      if (countries?.length) {
        await this.query(upDateInactive, [resultId]);

        return await this.query(upDateActive, [resultId]);
      } else {
        return await this.query(upDateAllInactive, [resultId]);
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
