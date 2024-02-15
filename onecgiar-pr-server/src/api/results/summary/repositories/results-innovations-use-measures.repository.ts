import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultsInnovationsUseMeasures } from '../entities/results-innovations-use-measures.entity';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
  ReplicableInterface,
} from '../../../../shared/globalInterfaces/replicable.interface';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';
import { predeterminedDateValidation } from '../../../../shared/utils/versioning.utils';
import { BaseRepository } from '../../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class ResultsInnovationsUseMeasuresRepository
  extends BaseRepository<ResultsInnovationsUseMeasures>
  implements
    ReplicableInterface<ResultsInnovationsUseMeasures>,
    LogicalDelete<ResultsInnovationsUseMeasures>
{
  createQueries(
    config: ReplicableConfigInterface<ResultsInnovationsUseMeasures>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
     select 
     null as result_innovations_use_measure_id,
     rium.unit_of_measure,
     rium.quantity,
     rium.is_active,
     ${predeterminedDateValidation(config?.predetermined_date)} as created_date,
     null as last_updated_date,
     riu2.result_innovation_use_id as result_innovation_use_id,
     rium.unit_of_measure_id,
     ${config.user.id} as created_by,
     null as last_updated_by
     from results_innovations_use_measures rium 
       inner join results_innovations_use riu on riu.result_innovation_use_id = rium.result_innovation_use_id 
                           and riu.results_id = ${config.old_result_id}
       inner join results_innovations_use riu2 on riu2.results_id = ${
         config.new_result_id
       }
     where rium.is_active > 0
     `,
      insertQuery: `
     insert into results_innovations_use_measures 
       (
       unit_of_measure,
       quantity,
       is_active,
       created_date,
       last_updated_date,
       result_innovation_use_id,
       unit_of_measure_id,
       created_by,
       last_updated_by
       )
       select
       rium.unit_of_measure,
       rium.quantity,
       rium.is_active,
       ${predeterminedDateValidation(
         config?.predetermined_date,
       )} as created_date,
       null as last_updated_date,
       riu2.result_innovation_use_id as result_innovation_use_id,
       rium.unit_of_measure_id,
       ${config.user.id} as created_by,
       null as last_updated_by
       from results_innovations_use_measures rium 
         inner join results_innovations_use riu on riu.result_innovation_use_id = rium.result_innovation_use_id 
                             and riu.results_id = ${config.old_result_id}
         inner join results_innovations_use riu2 on riu2.results_id = ${
           config.new_result_id
         }
       where rium.is_active > 0;`,
      returnQuery: `
      select 
      rium.*
      from results_innovations_use_measures rium 
        inner join results_innovations_use riu on riu.result_innovation_use_id = rium.result_innovation_use_id
      where riu.results_id = ${config.new_result_id} 
      `,
    };
  }
  private readonly _logger: Logger = new Logger(
    ResultsInnovationsUseMeasuresRepository.name,
  );

  constructor(
    private dataSource: DataSource,
    private _handlersError: HandlersError,
  ) {
    super(ResultsInnovationsUseMeasures, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete rium from results_innovations_use_measures rium 
    inner join results_innovations_use riu on riu.result_innovation_use_id = rium.result_innovation_use_id
where riu.results_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsInnovationsUseMeasuresRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultsInnovationsUseMeasures> {
    const queryData = `update results_innovations_use_measures rium 
                            inner join results_innovations_use riu on riu.result_innovation_use_id = rium.result_innovation_use_id
                        set rium.is_active = 0
                        where riu.results_id = ?;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsInnovationsUseMeasuresRepository.name,
          debug: true,
        }),
      );
  }

  async replicable(
    config: ReplicableConfigInterface<ResultsInnovationsUseMeasures>,
  ): Promise<ResultsInnovationsUseMeasures[]> {
    let final_data: ResultsInnovationsUseMeasures[] = null;
    try {
      if (config.f?.custonFunction) {
        const queryData = `
        select 
        null as result_innovations_use_measure_id,
        rium.unit_of_measure,
        rium.quantity,
        rium.is_active,
        ${predeterminedDateValidation(
          config?.predetermined_date,
        )} as created_date,
        null as last_updated_date,
        riu2.result_innovation_use_id as result_innovation_use_id,
        rium.unit_of_measure_id,
        ? as created_by,
        null as last_updated_by
        from results_innovations_use_measures rium 
        	inner join results_innovations_use riu on riu.result_innovation_use_id = rium.result_innovation_use_id 
        											and riu.results_id = ?
        	inner join results_innovations_use riu2 on riu2.results_id = ?
        where rium.is_active > 0
        `;
        const response = await (<Promise<ResultsInnovationsUseMeasures[]>>(
          this.query(queryData, [
            config.user.id,
            config.old_result_id,
            config.new_result_id,
          ])
        ));
        const response_edit = <ResultsInnovationsUseMeasures[]>(
          config.f.custonFunction(response)
        );
        final_data = await this.save(response_edit);
      } else {
        const queryData = `
        insert into results_innovations_use_measures 
          (
          unit_of_measure,
          quantity,
          is_active,
          created_date,
          last_updated_date,
          result_innovation_use_id,
          unit_of_measure_id,
          created_by,
          last_updated_by
          )
          select
          rium.unit_of_measure,
          rium.quantity,
          rium.is_active,
          ${predeterminedDateValidation(
            config?.predetermined_date,
          )} as created_date,
          null as last_updated_date,
          riu2.result_innovation_use_id as result_innovation_use_id,
          rium.unit_of_measure_id,
          ? as created_by,
          null as last_updated_by
          from results_innovations_use_measures rium 
          	inner join results_innovations_use riu on riu.result_innovation_use_id = rium.result_innovation_use_id 
          											and riu.results_id = ?
          	inner join results_innovations_use riu2 on riu2.results_id = ?
          where rium.is_active > 0;`;
        await this.query(queryData, [
          config.user.id,
          config.old_result_id,
          config.new_result_id,
        ]);

        const queryFind = `
        select 
        rium.result_innovations_use_measure_id,
        rium.unit_of_measure,
        rium.quantity,
        rium.is_active,
        rium.created_date,
        rium.last_updated_date,
        rium.result_innovation_use_id,
        rium.unit_of_measure_id,
        rium.created_by,
        rium.last_updated_by
        from results_innovations_use_measures rium 
        	inner join results_innovations_use riu on riu.result_innovation_use_id = rium.result_innovation_use_id
        where riu.results_id = ? 
        `;
        final_data = await this.query(queryFind, [config.new_result_id]);
      }
    } catch (error) {
      config.f?.errorFunction
        ? config.f.errorFunction(error)
        : this._logger.error(error);
      final_data = null;
    }

    config.f?.completeFunction?.({ ...final_data });

    return final_data;
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
    	rium.created_by,
    	rium.last_updated_by
    from
    	results_innovations_use_measures rium
    where
    	rium.result_innovations_use_measure_id = ?;

    `;
    try {
      const resultTocResult: ResultsInnovationsUseMeasures[] = await this.query(
        queryData,
        [innovationsUseMeasureId],
      );
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
    	rium.created_by,
    	rium.last_updated_by
    from
    	results_innovations_use_measures rium
    where
    	rium.result_innovation_use_id = ?
      and rium.is_active > 0;

    `;
    try {
      const resultTocResult: ResultsInnovationsUseMeasures[] = await this.query(
        queryData,
        [innovationsUseId],
      );
      return resultTocResult;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsInnovationsUseMeasuresRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateInnovatonUseMeasures(
    innovationUseId: number,
    unitOfMeasure: number[],
    userId: number,
  ) {
    const initiative = unitOfMeasure ?? [];
    const upDateInactive = `
    update results_innovations_use_measures  
    set is_active = 0,
      last_updated_date  = NOW(),
      last_updated_by = ?
    where is_active > 0 
      and result_innovation_use_id = ?
      and result_innovations_use_measure_id not in (${unitOfMeasure.toString()});
    `;

    const upDateActive = `
    update results_innovations_use_measures  
    set is_active = 1,
      last_updated_date  = NOW(),
      last_updated_by = ?
    where result_innovation_use_id = ?
      and result_innovations_use_measure_id in (${unitOfMeasure.toString()})
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
      if (initiative?.length) {
        await this.query(upDateInactive, [userId, innovationUseId]);

        return await this.query(upDateActive, [userId, innovationUseId]);
      } else {
        return await this.query(upDateAllInactive, [userId, innovationUseId]);
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
