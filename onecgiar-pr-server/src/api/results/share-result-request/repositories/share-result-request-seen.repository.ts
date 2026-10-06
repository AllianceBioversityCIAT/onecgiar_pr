import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ShareResultRequestSeen } from '../entities/share-result-request-seen.entity';

/**
 * `BRS-T-1` / design.md 7. Both methods take `userId` explicitly and bind it as a parameter;
 * the caller identity is never derived here (`BRS-R-2` isolation, `D2`).
 */
@Injectable()
export class ShareResultRequestSeenRepository extends Repository<ShareResultRequestSeen> {
  constructor(dataSource: DataSource) {
    super(ShareResultRequestSeen, dataSource.createEntityManager());
  }

  /** Which of `ids` has `userId` already seen. One query; empty `ids` -> no query. */
  async findSeenIds(userId: number, ids: number[]): Promise<Set<number>> {
    if (!ids?.length) {
      return new Set<number>();
    }

    const placeholders = ids.map(() => '?').join(', ');
    const rows: { share_result_request_id: number }[] = await this.query(
      `SELECT share_result_request_id
       FROM share_result_request_seen
       WHERE user_id = ?
         AND share_result_request_id IN (${placeholders})`,
      [userId, ...ids],
    );

    return new Set(rows.map((row) => Number(row.share_result_request_id)));
  }

  /**
   * Marks `ids` as seen by `userId` in a single bulk statement. Pairs that already exist are
   * skipped (`INSERT IGNORE` over the composite PK), so re-running is a no-op (`BRS-R-4`).
   * Returns the number of rows actually inserted; empty `ids` -> no query, 0.
   *
   * Raw statement with bound params (never interpolated): TypeORM's `orIgnore()` would emit the
   * same `INSERT IGNORE`, but the explicit SQL keeps the one-statement guarantee visible.
   */
  async insertIgnore(userId: number, ids: number[]): Promise<number> {
    if (!ids?.length) {
      return 0;
    }

    const rows = ids.map(() => '(?, ?)').join(', ');
    const params = ids.flatMap((id) => [id, userId]);
    const result = await this.query(
      `INSERT IGNORE INTO \`share_result_request_seen\` (\`share_result_request_id\`, \`user_id\`)
       VALUES ${rows}`,
      params,
    );

    return Number(result?.affectedRows ?? 0);
  }
}
