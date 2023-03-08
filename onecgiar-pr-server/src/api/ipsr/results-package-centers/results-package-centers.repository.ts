import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsPackageCenter } from './entities/results-package-center.entity';

@Injectable()
export class ResultsPackageCenterRepository extends Repository<ResultsPackageCenter> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsPackageCenter, dataSource.createEntityManager());
  }

  async updateCenter(resultPId: number, centerArray: string[], userId: number) {
    const center = centerArray??[];
    const upDateInactive = `
      update results_innovation_package_center  
      set is_active  = 0,
        is_primary = 0,
        last_updated_date = NOW(),
        last_updated_by = ?
      where is_active > 0 
        and results_package_center_id = ?
        and center_id not in (${`'${center.toString().replace(/,/g,'\',\'')}'`});
    `;

    const upDateActive = `
      update results_innovation_package_center  
      set is_active  = 1, 
        is_primary = 0,
        last_updated_date = NOW(),
        last_updated_by = ?
      where results_package_center_id = ?
        and center_id in (${`'${center.toString().replace(/,/g,'\',\'')}'`});
    `;

    const upDateAllInactive = `
      update results_innovation_package_center  
      set is_active  = 0, 
        is_primary = 0,
        last_updated_date = NOW(),
        last_updated_by = ?
      where is_active > 0 
        and results_package_center_id = ?;
    `;

    try {
      if(center?.length){
        const upDateInactiveResult = await this.query(upDateInactive, [
          userId, resultPId
        ]);
  
        return await this.query(upDateActive, [
          userId, resultPId
        ]);
      }else{
        return await this.query(upDateAllInactive, [
          userId, resultPId
        ]);
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsPackageCenterRepository.name,
        error: `updateCenter ${error}`,
        debug: true,
      });
    }
  }
}