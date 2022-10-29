import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultRegion } from './entities/result-region.entity';

@Injectable()
export class ResultRegionRepository extends Repository<ResultRegion> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultRegion, dataSource.createEntityManager());
  }

  async getAllResultRegion(){
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
      const result: ResultRegion[] = await this.query(query);
      return result;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRegionRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultRegionByResultId(resultId: number){
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

  async getResultRegionByResultIdAndRegionId(resultId: number, regionId: number){
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
      and rr.region_id = ?;
    `;

    try {
      const result: ResultRegion[] = await this.query(query, [resultId, regionId]);
      return result;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultRegionRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getResultRegionById(id: number){
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
    const regions = regionArray??[];
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
      if(regions?.length){
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
        className: ResultRegionRepository.name,
        error: `updateRegions ${error}`,
        debug: true,
      });
    }
  }
}