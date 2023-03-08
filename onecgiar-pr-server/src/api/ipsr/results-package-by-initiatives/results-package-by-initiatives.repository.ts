import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsPackageByInitiative } from './entities/results-package-by-initiative.entity';

@Injectable()
export class ResultsPackageByInitiativeRepository extends Repository<ResultsPackageByInitiative> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsPackageByInitiative, dataSource.createEntityManager());
  }

  async updateResultByInitiative(resultPId: number, initiativeArray: number[], userId: number) {
    const initiative = initiativeArray??[];
    const upDateInactive = `
      update results_innovation_package_by_initiative  
      set is_active = 0,
        last_updated_date = NOW(),
        planned_result = NULL,
        last_updated_by = ?
      where is_active > 0 
        and results_package_id = ?
        and initiative_id not in (${initiative.toString()});
    `;

    const upDateActive = `
      update results_innovation_package_by_initiative  
      set is_active = 1,
        last_updated_date = NOW(),
       /* planned_result = NULL, */
        last_updated_by = ?
      where results_package_id = ?
        and initiative_id in (${initiative.toString()});
    `;

    const upDateAllInactive = `
    update results_innovation_package_by_initiative  
      set is_active = 0,
        last_updated_date = NOW(),
        planned_result = NULL,
        last_updated_by = ?
      where is_active > 0 
        and results_package_id = ?;
    `;

    try {
      if (initiative?.length) {

        const upDateInactiveResult = await this.query(upDateInactive, [
          userId,
          resultPId,
        ]);
  
        //return await this.query(upDateActive, [userId, resultPId]);
      } else {
        return await this.query(upDateAllInactive, [userId, resultPId]);
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsPackageByInitiativeRepository.name,
        error: `updateResultByInitiative ${error}`,
        debug: true,
      });
    }
  }
}