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

  /**
   * P2-3157 — full review trail for a result, newest first.
   *
   * Backs the centre-facing "why was this rejected" view: the rejection justification lives in
   * `comment`. UPDATE entries are included on purpose so the centre can also see what the Science
   * Program edited during review (UX Finding 5.3.1 — "no review history visible to submitters").
   */
  async getReviewHistoryByResultId(
    resultId: number,
  ): Promise<ResultReviewHistory[]> {
    const queryData = `
    SELECT
      rrh.id,
      rrh.result_id,
      rrh.action,
      rrh.comment,
      rrh.created_at,
      rrh.created_by,
      u.first_name,
      u.last_name,
      u.email
    FROM result_review_history rrh
      LEFT JOIN users u ON u.id = rrh.created_by
    WHERE rrh.result_id = ?
    ORDER BY rrh.created_at DESC, rrh.id DESC;
    `;
    try {
      return await this.query(queryData, [resultId]);
    } catch (error) {
      throw this._handlersError.returnErrorRepository({
        className: ResultReviewHistoryRepository.name,
        error,
        debug: true,
      });
    }
  }
}
