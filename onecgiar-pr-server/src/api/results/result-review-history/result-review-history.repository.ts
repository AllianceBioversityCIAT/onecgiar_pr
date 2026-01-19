import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { HandlersError } from '../../../shared/handlers/error.utils';
import { ResultReviewHistory } from './entities/result-review-history.entity';

@Injectable()
export class ResultReviewHistoryRepository extends Repository<ResultReviewHistory> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly _handlersError: HandlersError,
  ) {
    super(ResultReviewHistory, dataSource.createEntityManager());
  }

  async createReviewHistory(
    resultId: number,
    action: string,
    comment: string | null,
    createdBy: number,
  ): Promise<ResultReviewHistory> {
    try {
      const reviewHistory = this.create({
        result_id: resultId,
        action: action as any,
        comment: comment || null,
        created_by: createdBy,
      });

      return await this.save(reviewHistory);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultReviewHistoryRepository.name,
        error,
        debug: true,
      });
    }
  }
}
