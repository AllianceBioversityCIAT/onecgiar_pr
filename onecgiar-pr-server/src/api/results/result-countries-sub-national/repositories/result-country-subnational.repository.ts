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

  async upsertSubnational(
    rcId: number,
    subnationalCodes: string[],
    userId: number,
  ) {
    try {
      const resultSubnationalArray: ResultCountrySubnational[] = [];

      for (const subnationalCode of subnationalCodes) {
        const existing = await this.findOneBy({
          is_active: true,
          result_country_id: rcId,
          clarisa_subnational_scope_code: subnationalCode,
        });

        if (!existing) {
          const newSubnational = new ResultCountrySubnational();
          newSubnational.clarisa_subnational_scope_code = subnationalCode;
          newSubnational.result_country_id = rcId;
          newSubnational.created_by = userId;
          newSubnational.last_updated_by = userId;
          resultSubnationalArray.push(newSubnational);
        }
      }

      await this.save(resultSubnationalArray);
    } catch (err) {
      throw this._handlersError.returnErrorRepository({
        className: ResultCountrySubnationalRepository.name,
        error: err,
        debug: true,
      });
    }
  }

  async bulkUpdateSubnational(
    rcId: number,
    subnationalCodes: string[],
    userId: number,
  ) {
    const subnationals = subnationalCodes ?? [];
    const upDateInactive = `
    update result_country_subnational  
    set is_active = 0, 
    	last_updated_date = NOW(),
      last_updated_by = ?
    where is_active > 0 
    	and result_country_id  = ?
    	and clarisa_subnational_scope_code not in (${subnationals
        .map((c) => `"${c}"`)
        .toString()});
    `;

    const upDateActive = `
    update result_country_subnational  
    set is_active = 1, 
    	last_updated_date = NOW(),
      last_updated_by = ?
    where result_country_id  = ?
    	and clarisa_subnational_scope_code in (${subnationals
        .map((c) => `"${c}"`)
        .toString()});
    `;

    const upDateAllInactive = `
    update result_country_subnational  
    set is_active = 0, 
    	last_updated_date = NOW(),
      last_updated_by = ?
    where result_country_id = ?;
    `;

    try {
      if (subnationals?.length) {
        await this.query(upDateInactive, [userId, rcId]);

        return await this.query(upDateActive, [userId, rcId]);
      } else {
        return await this.query(upDateAllInactive, [userId, rcId]);
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultCountrySubnationalRepository.name,
        error: `updateSubnational ${error}`,
        debug: true,
      });
    }
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
