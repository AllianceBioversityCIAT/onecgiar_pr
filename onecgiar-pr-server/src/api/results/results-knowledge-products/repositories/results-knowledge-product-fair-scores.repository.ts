import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultsKnowledgeProductFairScore } from '../entities/results-knowledge-product-fair-scores.entity';
import { LogicalDelete } from '../../../../shared/globalInterfaces/delete.interface';

@Injectable()
export class ResultsKnowledgeProductFairScoreRepository
  extends Repository<ResultsKnowledgeProductFairScore>
  implements LogicalDelete<ResultsKnowledgeProductFairScore>
{
  private readonly _logger: Logger = new Logger(
    ResultsKnowledgeProductFairScore.name,
  );

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsKnowledgeProductFairScore, dataSource.createEntityManager());
  }

  logicalDelete(resultId: number): Promise<ResultsKnowledgeProductFairScore> {
    const queryData = `update results_kp_fair_scores rkk 
    inner join results_knowledge_product rkp on rkk.result_knowledge_product_id = rkp.result_knowledge_product_id 
  set rkk.is_active = 0
  where rkp.results_id = ?
    and rkk.is_active > 0;`;
    return this.query(queryData, [resultId])
      .then((res) => res)
      .catch((err) =>
        this._handlersError.returnErrorRepository({
          error: err,
          className: ResultsKnowledgeProductFairScoreRepository.name,
          debug: true,
        }),
      );
  }

  async statusElement(kpId: number, status: boolean) {
    const query = `
    UPDATE results_kp_fair_scores 
    SET is_active = ?
    WHERE result_knowledge_product_id = ?;
    `;
    try {
      return await this.query(query, [status ? 1 : 0, kpId]);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultsKnowledgeProductFairScoreRepository.name,
        error: error,
        debug: true,
      });
    }
  }
}
