import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsInnovationsUseMeasures } from '../entities/results-innovations-use-measures.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';

@Injectable()
export class ResultsInnovationsUseMeasuresRepository extends Repository<ResultsInnovationsUseMeasures> {
  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError

  ) {
    super(ResultsInnovationsUseMeasures, dataSource.createEntityManager());
  }

  async innovatonUseMeasuresExists(innovationsUseMeasureId: number) {
    const queryData = `
    SELECT
    	rium.result_innovations_use_measure_id,
    	rium.unit_of_measure,
    	rium.quantity,
    	rium.is_active,
    	rium.created_date,
    	rium.last_updated_date,
    	rium.result_innovation_use_id,
    	rium.unit_of_measure_id,
    	rium.version_id,
    	rium.created_by,
    	rium.last_updated_by
    from
    	results_innovations_use_measures rium
    where
    	rium.result_innovations_use_measure_id = ?;

    `;
    try {
      const resultTocResult: ResultsInnovationsUseMeasures[] = await this.query(queryData, [innovationsUseMeasureId]);
      return resultTocResult.length ? resultTocResult[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInnovationsUseMeasuresRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAllResultInnovationsUseMeasureByInnoUseId(innovationsUseId: number) {
    const queryData = `
    SELECT
    	rium.result_innovations_use_measure_id,
    	rium.unit_of_measure,
    	rium.quantity,
    	rium.is_active,
    	rium.created_date,
    	rium.last_updated_date,
    	rium.result_innovation_use_id,
    	rium.unit_of_measure_id,
    	rium.version_id,
    	rium.created_by,
    	rium.last_updated_by
    from
    	results_innovations_use_measures rium
    where
    	rium.result_innovation_use_id = ?
      and rium.is_active > 0;

    `;
    try {
      const resultTocResult: ResultsInnovationsUseMeasures[] = await this.query(queryData, [innovationsUseId]);
      return resultTocResult;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInnovationsUseMeasuresRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateInnovatonUseMeasures(innovationUseId: number, unitOfMeasure: string[], userId: number) {
    const initiative = unitOfMeasure??[];
    const upDateInactive = `
    update results_innovations_use_measures  
    set is_active = 0,
      last_updated_date  = NOW(),
      last_updated_by = ?
    where is_active > 0 
      and result_innovation_use_id = ?
      and unit_of_measure not in (${`'${unitOfMeasure.toString().replace(/,/g,'\',\'')}'`});
    `;

    const upDateActive = `
    update results_innovations_use_measures  
    set is_active = 1,
      last_updated_date  = NOW(),
      last_updated_by = ?
    where result_innovation_use_id = ?
      and unit_of_measure in (${`'${unitOfMeasure.toString().replace(/,/g,'\',\'')}'`})
    `;

    const upDateAllInactive = `
    update results_innovations_use_measures  
    set is_active = 0,
      last_updated_date  = NOW(),
      last_updated_by = ?
    where is_active > 0 
      and result_innovation_use_id = ?;
    `;

    try {
      if(initiative?.length){
        const upDateInactiveResult = await this.query(upDateInactive, [
          userId, innovationUseId
        ]);
  
        return await this.query(upDateActive, [
          userId, innovationUseId
        ]);
      }else{
        return await this.query(upDateAllInactive, [
          userId, innovationUseId
        ]);
      }
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInnovationsUseMeasuresRepository.name,
        error: `updateResultByInitiative ${error}`,
        debug: true,
      });
    }
  }
}
