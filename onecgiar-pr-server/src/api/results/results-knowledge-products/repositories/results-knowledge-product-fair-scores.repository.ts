import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../../shared/handlers/error.utils';
import { ResultsKnowledgeProductFairScore } from '../entities/results-knowledge-product-fair-scores.entity';

@Injectable()
export class ResultsKnowledgeProductFairScoreRepository extends Repository<ResultsKnowledgeProductFairScore> {
  private readonly _logger: Logger = new Logger(
    ResultsKnowledgeProductFairScore.name,
  );

  constructor(
    private dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultsKnowledgeProductFairScore, dataSource.createEntityManager());
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
