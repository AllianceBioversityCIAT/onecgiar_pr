import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultCountriesSubNational } from '../entities/result-countries-sub-national.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultCountriesSubNationalRepository
  extends Repository<ResultCountriesSubNational>
  implements LogicalDelete<ResultCountriesSubNational>
{
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultCountriesSubNational, dataSource.createEntityManager());
  }

  logicalDelete(resultId: number): Promise<ResultCountriesSubNational> {
    const dataQuery = `update result_countries_sub_national rcsn 
    inner join results_by_institution rbi on rbi.id = rcsn.result_countries_id 
  set rcsn.is_active = 0
  where rbi.result_id = ?`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultCountriesSubNationalRepository.name,
          debug: true,
        }),
      );
  }
  fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `delete rcsn from result_countries_sub_national rcsn 
    inner join results_by_institution rbi on rbi.id = rcsn.result_countries_id 
  where rbi.result_id = ?`;
    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultCountriesSubNationalRepository.name,
          debug: true,
        }),
      );
  }

  async inactiveAllIds(result_countries_id: number[]): Promise<void> {
    try {
      const inactiveQuery = `
        UPDATE
          result_countries_sub_national
        set
          is_active = FALSE
        WHERE
          result_countries_id in (${
            result_countries_id?.length ? result_countries_id.toString() : null
          });
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
