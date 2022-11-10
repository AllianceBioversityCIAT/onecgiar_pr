import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultsTocResult } from './entities/results-toc-result.entity';

@Injectable()
export class ResultsTocResultRepository extends Repository<ResultsTocResult> {
  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsTocResult, dataSource.createEntityManager());
  }

  async getResultTocResultById(id: string) {
    const queryData = `
    SELECT
      rtr.result_toc_result_id,
      rtr.planned_result ,
      rtr.is_active ,
      rtr.created_date ,
      rtr.last_updated_date ,
      rtr.toc_result_id ,
      rtr.results_id ,
      rtr.action_area_outcome_id ,
      rtr.version_id ,
      rtr.created_by ,
      rtr.last_updated_by
    FROM
      results_toc_result rtr 
    WHERE rtr.result_toc_result_id = ?;
    `;
    try {
      const resultTocResult: ResultsTocResult[] = await this.query(queryData, [id]);
      return resultTocResult.length ? resultTocResult[0] : undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAllResultTocResult() {
    const queryData = `
    SELECT
      rtr.result_toc_result_id,
      rtr.planned_result ,
      rtr.is_active ,
      rtr.created_date ,
      rtr.last_updated_date ,
      rtr.toc_result_id ,
      rtr.results_id ,
      rtr.action_area_outcome_id ,
      rtr.version_id ,
      rtr.created_by ,
      rtr.last_updated_by
    FROM
      results_toc_result rtr;
    `;
    try {
      const resultTocResult: ResultsTocResult[] = await this.query(queryData);
      return resultTocResult;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }

  async getAllResultTocResultByResultId(resultId: number) {
    const queryData = `
    SELECT
      rtr.result_toc_result_id,
      rtr.planned_result ,
      rtr.is_active ,
      rtr.created_date ,
      rtr.last_updated_date ,
      rtr.toc_result_id ,
      rtr.results_id ,
      rtr.action_area_outcome_id ,
      rtr.version_id ,
      rtr.created_by ,
      rtr.last_updated_by
    FROM
      results_toc_result rtr
    where rtr.results_id = ?;
    `;
    try {
      const resultTocResult: ResultsTocResult[] = await this.query(queryData, [resultId]);
      return resultTocResult?.length?resultTocResult[0]:undefined;
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsTocResultRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
