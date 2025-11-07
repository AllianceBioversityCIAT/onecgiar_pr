import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRegion } from './entities/result-region.entity';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../shared/globalInterfaces/replicable.interface';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';
import { predeterminedDateValidation } from '../../../shared/utils/versioning.utils';
import { BaseRepository } from '../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class ResultRegionRepository
  extends BaseRepository<ResultRegion>
  implements LogicalDelete<ResultRegion>
{
  createQueries(
    config: ReplicableConfigInterface<ResultRegion>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      select 
      null as result_region_id,
      rr.is_active,
      ${predeterminedDateValidation(
        config?.predetermined_date,
      )} as created_date,
      null as last_updated_date,
      rr.region_id,
      ${config.new_result_id} as result_id
      from result_region rr WHERE  rr.result_id = ${
        config.old_result_id
      } and rr.is_active > 0
      `,
      insertQuery: `
      insert into result_region (
        is_active,
        created_date,
        last_updated_date,
        region_id,
        result_id
        )
        select
        rr.is_active,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date,
        null as last_updated_date,
        rr.region_id,
        ${config.new_result_id} as result_id
        from result_region rr WHERE  rr.result_id = ${
          config.old_result_id
        } and rr.is_active > 0
      `,
      returnQuery: `
      select 
      rr.*
      from result_region rr WHERE  rr.result_id = ${config.new_result_id}`,
    };
  }
  private readonly _logger: Logger = new Logger(ResultRegionRepository.name);

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultRegion, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete rr from result_region rr where rr.result_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultRegionRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultRegion> {
    const queryData = `update result_region set is_active = 0 where result_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultRegionRepository.name,
          debug: true,
        }),
      );
  }

  async getAllResultRegion() {
    const query = `
    select 
    rr.result_region_id,
    rr.region_id,
    rr.result_id,
    rr.is_active,
    rr.created_date,
    rr.last_updated_date 
    from result_region rr 
    where rr.is_active > 0;
    `;

    try {
      const result: ResultRegion[] = await this.query(query, []);
      return result;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRegionRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultRegionByResultId(resultId: number) {
    const query = `
    select 
    rr.result_region_id,
    rr.region_id as id,
    rr.result_id,
    rr.is_active,
    rr.created_date,
    rr.last_updated_date,
    rr.geo_scope_role_id,
    cr.name
    from result_region rr 
    inner join clarisa_regions cr on cr.um49Code = rr.region_id 
    where rr.is_active > 0
      and rr.result_id = ?;
    `;

    try {
      const result: ResultRegion[] = await this.query(query, [resultId]);
      return result;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRegionRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultRegionByResultIdAndRegionId(
    resultId: number,
    regionId: number,
    geo_scope_role_id: number = 1,
  ) {
    const query = `
      select 
        rr.result_region_id,
        rr.region_id,
        rr.result_id,
        rr.is_active,
        rr.created_date,
        rr.last_updated_date 
      from result_region rr 
      where rr.is_active > 0
        and rr.result_id = ?
        and rr.region_id = ?
        and rr.geo_scope_role_id = ?;
    `;

    try {
      const result: ResultRegion[] = await this.query(query, [
        resultId,
        regionId,
        geo_scope_role_id,
      ]);
      return result?.length ? result[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRegionRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultRegionById(id: number) {
    const query = `
    select 
    rr.result_region_id,
    rr.region_id,
    rr.result_id,
    rr.is_active,
    rr.created_date,
    rr.last_updated_date 
    from result_region rr 
    where rr.is_active > 0
      and rr.result_region_id = ?;
    `;

    try {
      const result: ResultRegion[] = await this.query(query, [id]);
      return result;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRegionRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateRegions(resultId: number, regionArray: number[]) {
    const regions = regionArray ?? [];
    const upDateInactive = `
    update result_region  
    set is_active = 0, 
    	last_updated_date  = NOW()
    where is_active > 0 
    	and result_id = ?
    	and region_id not in (${regions.toString()});
    `;

    const upDateActive = `
    update result_region  
    set is_active = 1, 
    	last_updated_date  = NOW()
    where result_id = ?
    	and region_id in (${regions.toString()});
    `;

    const upDateAllInactive = `
    update result_region  
    set is_active = 0, 
    	last_updated_date  = NOW()
    where is_active > 0 
    	and result_id = ?;
    `;

    try {
      if (regions?.length) {
        await this.query(upDateInactive, [resultId]);

        return await this.query(upDateActive, [resultId]);
      } else {
        return await this.query(upDateAllInactive, [resultId]);
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRegionRepository.name,
        error: `updateRegions ${error}`,
        debug: true,
      });
    }
  }

  async updateRegionsV2(
    resultId: number,
    regionArray: number[] = [],
    roleId: number,
  ): Promise<void> {
    try {
      if (regionArray.length > 0) {
        console.log('Regions to update', roleId, regionArray);

        await this.query(
          `
          UPDATE result_region
          SET is_active = 0,
              last_updated_date = NOW()
          WHERE is_active > 0
            AND geo_scope_role_id = ?
            AND result_id = ?
            AND region_id NOT IN (${regionArray.map(() => '?').join(', ')});
          `,
          [roleId, resultId, ...regionArray],
        );

        await this.query(
          `
          UPDATE result_region
          SET is_active = 1,
              last_updated_date = NOW()
          WHERE geo_scope_role_id = ?
            AND result_id = ?
            AND region_id IN (${regionArray.map(() => '?').join(', ')});
          `,
          [roleId, resultId, ...regionArray],
        );

        console.log('Regions updated', regionArray, roleId);
      } else {
        console.log('No regions to update', roleId);
        await this.query(
          `
          UPDATE result_region
          SET is_active = 0,
              last_updated_date = NOW()
          WHERE is_active > 0
            AND geo_scope_role_id = ?
            AND result_id = ?;
          `,
          [roleId, resultId],
        );
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRegionRepository.name,
        error: `updateRegionsV2 ${error}`,
        debug: true,
      });
    }
  }
}
