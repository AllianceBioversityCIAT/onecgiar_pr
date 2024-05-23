import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsCenter } from './entities/results-center.entity';
import {
  ConfigCustomQueryInterface,
  ReplicableConfigInterface,
} from '../../../shared/globalInterfaces/replicable.interface';
import { LogicalDelete } from '../../../shared/globalInterfaces/delete.interface';
import { predeterminedDateValidation } from '../../../shared/utils/versioning.utils';
import { BaseRepository } from '../../../shared/extendsGlobalDTO/base-repository';

@Injectable()
export class ResultsCenterRepository
  extends BaseRepository<ResultsCenter>
  implements LogicalDelete<ResultsCenter>
{
  createQueries(
    config: ReplicableConfigInterface<ResultsCenter>,
  ): ConfigCustomQueryInterface {
    return {
      findQuery: `
      select 
      null as id,
      rc.is_primary,
      rc.is_active,
      ${predeterminedDateValidation(
        config?.predetermined_date,
      )} as created_date,
      null as last_updated_date,
      ${config.new_result_id} as result_id,
      ${config.user.id} as created_by,
      null as last_updated_by,
      rc.center_id
      from results_center rc WHERE rc.result_id = ${
        config.old_result_id
      } and rc.is_active > 0
      `,
      insertQuery: `
      insert into results_center (
      is_primary,
      is_active,
      created_date,
      last_updated_date,
      result_id,
      created_by,
      last_updated_by,
      center_id
      )
      select 
      rc.is_primary,
      rc.is_active,
      ${predeterminedDateValidation(
        config?.predetermined_date,
      )} as created_date,
      null as last_updated_date,
      ${config.new_result_id} as result_id,
      ${config.user.id} as created_by,
      null as last_updated_by,
      rc.center_id
      from results_center rc WHERE rc.result_id = ${
        config.old_result_id
      } and rc.is_active > 0`,
      returnQuery: `
      select 
      rc.*
      from results_center rc WHERE rc.result_id = ${config.new_result_id}`,
    };
  }
  private readonly _logger: Logger = new Logger(ResultsCenterRepository.name);

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsCenter, dataSource.createEntityManager());
  }

  fisicalDelete(resultId: number): Promise<any> {
    const queryData = `delete rc from results_center rc where rc.result_id = ?`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsCenterRepository.name,
          debug: true,
        }),
      );
  }

  logicalDelete(resultId: number): Promise<ResultsCenter> {
    const queryData = `update results_center rc set rc.is_active = 0 where rc.result_id = ? and rc.is_active > 0;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsCenterRepository.name,
          debug: true,
        }),
      );
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
      rc.is_primary as \`primary\`,
      rc.from_cgspace,
      rc.is_active,
      rc.created_date,
      rc.last_updated_date,
      rc.result_id,
      rc.created_by,
      rc.last_updated_by,
      rc.center_id as code,
      ci.name,
      ci.acronym 
      from results_center rc 
        left join clarisa_center cc on rc.center_id = cc.code 
      	left join clarisa_institutions ci on ci.id = cc.institutionId 
          and ci.is_active > 0
      WHERE rc.result_id = ?
        and rc.is_active > 0;
    `;
    try {
      const resultCenter: ResultsCenter[] = await this.query(queryData, [
        resultId,
      ]);
      return resultCenter;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsCenterRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAllResultsCenterByResultIdAndCenterId(
    resultId: number,
    centerId: string,
  ) {
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
      const resultCenter: ResultsCenter[] = await this.query(queryData, [
        resultId,
        centerId,
      ]);
      return resultCenter?.length ? resultCenter[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsCenterRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async updateCenter(resultId: number, centerArray: string[], userId: number) {
    const center = centerArray ?? [];
    const upDateInactive = `
      update results_center  
      set is_active  = 0,
        is_primary = 0,
        last_updated_date = NOW(),
        last_updated_by = ?
      where is_active > 0 
        and result_id = ?
        and center_id not in (${`'${center.toString().replace(/,/g, "','")}'`});
    `;

    const upDateActive = `
      update results_center  
      set is_active  = 1, 
        is_primary = 0,
        last_updated_date = NOW(),
        last_updated_by = ?
      where result_id = ?
        and center_id in (${`'${center.toString().replace(/,/g, "','")}'`});
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
      if (center?.length) {
        await this.query(upDateInactive, [userId, resultId]);

        return await this.query(upDateActive, [userId, resultId]);
      } else {
        return await this.query(upDateAllInactive, [userId, resultId]);
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
