import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsCenter } from './entities/results-center.entity';

@Injectable()
export class ResultsCenterRepository extends Repository<ResultsCenter> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsCenter, dataSource.createEntityManager());
  }

  async getAllResultsCenter() {
    const queryData = `
    select
      rc.id,
      rc.is_primary,
      rc.is_active,
      rc.created_date,
      rc.last_updated_date,
      rc.result_id,
      rc.created_by,
      rc.last_updated_by,
      rc.center_id
      from results_center rc ;
    `;
    try {
      const resultCenter: ResultsCenter[] = await this.query(queryData);
      return resultCenter;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsCenterRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAllResultsCenterByResultId(resultId: number) {
    const queryData = `
    select
      rc.id,
      rc.is_primary,
      rc.is_active,
      rc.created_date,
      rc.last_updated_date,
      rc.result_id,
      rc.created_by,
      rc.last_updated_by,
      rc.center_id,
      ci.name,
      ci.acronym 
      from results_center rc 
        left join clarisa_center cc on rc.center_id = cc.code 
      	left join clarisa_institutions ci on ci.id = cc.institutionId 
      WHERE rc.result_id = ?
        and rc.is_active > 0;
    `;
    try {
      const resultCenter: ResultsCenter[] = await this.query(queryData, [resultId]);
      return resultCenter;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsCenterRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAllResultsCenterByResultIdAndCenterId(resultId: number, centerId: string) {
    const queryData = `
    select
      rc.id,
      rc.is_primary,
      rc.is_active,
      rc.created_date,
      rc.last_updated_date,
      rc.result_id,
      rc.created_by,
      rc.last_updated_by,
      rc.center_id
      from results_center rc 
      WHERE rc.result_id = ?
      	and rc.center_id = ?;
    `;
    try {
      const resultCenter: ResultsCenter[] = await this.query(queryData, [resultId, centerId]);
      return resultCenter?.length? resultCenter[0]: undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsCenterRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateCenter(resultId: number, centerArray: string[], userId: number) {
    const center = centerArray??[];
    const upDateInactive = `
      update results_center  
      set is_active  = 0,
        is_primary = 0,
        last_updated_date = NOW(),
        last_updated_by = ?
      where is_active > 0 
        and result_id = ?
        and center_id not in (${`'${center.toString().replace(/,/g,'\',\'')}'`});
    `;

    const upDateActive = `
      update results_center  
      set is_active  = 1, 
        is_primary = 0,
        last_updated_date = NOW(),
        last_updated_by = ?
      where result_id = ?
        and center_id in (${`'${center.toString().replace(/,/g,'\',\'')}'`});
    `;

    const upDateAllInactive = `
      update results_center  
      set is_active  = 0, 
        is_primary = 0,
        last_updated_date = NOW(),
        last_updated_by = ?
      where is_active > 0 
        and result_id = ?;
    `;

    try {
      if(center?.length){
        const upDateInactiveResult = await this.query(upDateInactive, [
          userId, resultId
        ]);
  
        return await this.query(upDateActive, [
          userId, resultId
        ]);
      }else{
        return await this.query(upDateAllInactive, [
          userId, resultId
        ]);
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsCenterRepository.name,
        error: `updateCenter ${error}`,
        debug: true,
      });
    }
  }
}
