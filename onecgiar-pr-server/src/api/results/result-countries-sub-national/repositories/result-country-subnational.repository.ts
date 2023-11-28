import { Injectable } from '@nestjs/common';
import { ResultCountrySubnational } from '../entities/result-country-subnational.entity';
import { DataSource, Repository } from 'typeorm';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import { HandlersError } from '../../../../shared/handlers/error.utils';

@Injectable()
export class ResultCountrySubnationalRepository
  extends Repository<ResultCountrySubnational>
  implements LogicalDelete<ResultCountrySubnational>
{
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultCountrySubnational, dataSource.createEntityManager());
  }

  async logicalDelete(resultId: number): Promise<ResultCountrySubnational> {
    const dataQuery = `
        update result_country_subnational rcs 
        inner join result_country rc on rc.id = rcs.result_country_id 
        set rcs.is_active = 0
        where rc.result_id = ?
    `;

    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultCountrySubnationalRepository.name,
          debug: true,
        }),
      );
  }
  async fisicalDelete(resultId: number): Promise<any> {
    const dataQuery = `
        delete rcs from result_country_subnational rcs 
        inner join result_country rc on rc.id = rcs.result_country_id 
        where rc.result_id = ?
    `;

    return this.query(dataQuery, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultCountrySubnationalRepository.name,
          debug: true,
        }),
      );
  }

  async inactiveAllIds(result_country_id: number[]): Promise<void> {
    try {
      const inactiveQuery = `
        UPDATE result_country_subnational
        set is_active = 0
        WHERE result_country_id in (${
          result_country_id?.length ? result_country_id.toString() : null
        });
      `;
      await this.query(inactiveQuery);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultCountrySubnationalRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
