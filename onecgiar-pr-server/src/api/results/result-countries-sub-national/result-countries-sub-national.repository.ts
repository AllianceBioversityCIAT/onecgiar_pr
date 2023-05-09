import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultCountriesSubNational } from './entities/result-countries-sub-national.entity';

@Injectable()
export class ResultCountriesSubNationalRepository extends Repository<ResultCountriesSubNational> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultCountriesSubNational, dataSource.createEntityManager());
  }

  async inactiveAllIds(result_countries_id: number[]): Promise<void> {
    try {
      const inactiveQuery = `
        UPDATE
          result_countries_sub_national
        set
          is_active = FALSE
        WHERE
          result_countries_id in (${result_countries_id?.length ? result_countries_id.toString() : null});
        `;
      await this.query(inactiveQuery);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultCountriesSubNationalRepository.name,
        error: error,
        debug: true,
      });
    }
  }

}