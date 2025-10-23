import { Injectable } from '@nestjs/common';
import { ResultCountrySubnational } from '../entities/result-country-subnational.entity';
import { DataSource } from 'typeorm';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { predeterminedDateValidation } from '../../../../shared/utils/versioning.utils';

@Injectable()
export class ResultCountrySubnationalRepository
  extends BaseRepository<ResultCountrySubnational>
  implements LogicalDelete<ResultCountrySubnational>
{
  createQueries(
    config: ReplicableConfigInterface<ResultCountrySubnational>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      SELECT
          rcs.is_active,
          ${predeterminedDateValidation(
            config.predetermined_date,
          )} AS created_date,
          ${predeterminedDateValidation(
            config.predetermined_date,
          )} AS last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          (
            SELECT
              rc.result_country_id
            FROM
              result_country rc2 		
            WHERE
              rc2.result_id = ${config.new_result_id}
              AND rc2.country_id = rc.country_id
          ) AS result_country_id,
          rcs.clarisa_subnational_scope_code
      FROM
          result_country_subnational rcs
          LEFT JOIN result_country rc ON rc.result_country_id = rcs.result_country_id
      WHERE 
        rc.result_id = ${config.old_result_id}
        AND rc.is_active = 1
        AND rcs.is_active = 1;
      `,
      insertQuery: `
      INSERT INTO
        result_country_subnational (
            is_active,
            created_date,
            last_updated_date,
            created_by,
            last_updated_by,
            result_country_id,
            clarisa_subnational_scope_code
        )
      SELECT
          rcs.is_active,
          ${predeterminedDateValidation(
            config.predetermined_date,
          )} AS created_date,
          ${predeterminedDateValidation(
            config.predetermined_date,
          )} AS last_updated_date,
          ${config.user.id} AS created_by,
          ${config.user.id} AS last_updated_by,
          (
            SELECT
              rc2.result_country_id
            FROM
              result_country rc2 		
            WHERE
              rc2.result_id = ${config.new_result_id}
              AND rc2.country_id = rc.country_id
          ) AS result_country_id,
          rcs.clarisa_subnational_scope_code
      FROM
          result_country_subnational rcs
          LEFT JOIN result_country rc ON rc.result_country_id = rcs.result_country_id
      WHERE 
        rc.result_id = ${config.old_result_id}
        AND rc.is_active = 1
        AND rcs.is_active = 1;
      `,
      returnQuery: `
      SELECT
          rcs.result_country_subnational_id
      FROM
          result_country_subnational rcs
          LEFT JOIN result_country rc ON rc.result_country_id = rcs.result_country_id
      WHERE 
        rc.result_id = ${config.new_result_id}
        AND rc.is_active = 1;
      `,
    };
  }

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
    geoScopeRoleId: number,
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
    geoScopeRoleId: number,
  ) {
    const subnationals = subnationalCodes ?? [];

    const upDateInactive = `
      update result_country_subnational  
      set is_active = 0, 
        last_updated_date = NOW(),
        last_updated_by = ?
      where is_active > 0 
        and result_country_id  = ?
        and geo_scope_role_id = ?
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
        and geo_scope_role_id = ?
        and clarisa_subnational_scope_code in (${subnationals
          .map((c) => `"${c}"`)
          .toString()});
    `;

    const upDateAllInactive = `
      update result_country_subnational  
      set is_active = 0, 
        last_updated_date = NOW(),
        last_updated_by = ?
      where result_country_id = ?
        and geo_scope_role_id = ?;
    `;

    try {
      if (subnationals?.length) {
        await this.query(upDateInactive, [userId, rcId, geoScopeRoleId]);

        return await this.query(upDateActive, [userId, rcId, geoScopeRoleId]);
      } else {
        return await this.query(upDateAllInactive, [userId, rcId, geoScopeRoleId]);
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
