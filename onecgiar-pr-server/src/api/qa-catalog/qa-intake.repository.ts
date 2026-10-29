// @akili-spec quality-assurance/qa-intake
import { Injectable } from '@nestjs/common';
import { ResultStatusData } from '../../shared/constants/result-status.enum';
import { QaIntakeAction } from './qa-intake.constants';
import { QaQueryExecutor } from './qa-results.repository';

const SUBMITTED_STATUS_ID = ResultStatusData.Submitted.value;

/** One `result_qa_intake_log` row (design section 5). `created_date` is the DB's clock: never sent. */
export interface QaIntakeAuditRow {
  result_id: number;
  action: QaIntakeAction;
  phase_year: number;
  platform_id: number;
  platform_acronym: string;
}

const placeholders = (n: number) => Array(n).fill('?').join(', ');

/**
 * QIN-DD-3: the write-side statements of intake (and, later, release). Every method takes the
 * transaction's `manager` and runs on it - a statement on any other connection would sit outside the
 * lock and outside the rollback (P-10). Statement count is constant per call, never per id (NFR).
 */
@Injectable()
export class QaIntakeRepository {
  /**
   * Locks the batch's `result` rows (`SELECT ... FOR UPDATE`) and reads their `in_qa`. Ordered by id so two
   * overlapping batches take their locks in the same order. An id with no row is absent from the map.
   */
  async lockRows(
    ids: readonly number[],
    manager: QaQueryExecutor,
  ): Promise<Map<number, boolean>> {
    if (ids.length === 0) return new Map();
    const rows: { id: number; in_qa: number | boolean | null }[] =
      await manager.query(
        `SELECT r.id AS id, r.in_qa AS in_qa
FROM \`result\` r
WHERE r.id IN (${placeholders(ids.length)})
ORDER BY r.id ASC
FOR UPDATE`,
        [...ids],
      );
    return new Map(
      rows.map((row) => [Number(row.id), Number(row.in_qa) === 1]),
    );
  }

  /**
   * One compare-and-set UPDATE (QIN-R-7: the only column written is `in_qa`). The predicate re-states the
   * state the caller classified under the lock; the returned count is rows MATCHED (mysql2's default
   * FOUND_ROWS flag), so a value below `ids.length` means the state drifted. The caller asserts it (QIN-R-8).
   */
  async markInQa(
    ids: readonly number[],
    manager: QaQueryExecutor,
  ): Promise<number> {
    if (ids.length === 0) return 0;
    const res = await manager.query(
      `UPDATE \`result\`
SET in_qa = 1
WHERE id IN (${placeholders(ids.length)})
  AND is_active = 1
  AND status_id = ${SUBMITTED_STATUS_ID}
  AND in_qa = 0`,
      [...ids],
    );
    return Number(res?.affectedRows ?? 0);
  }

  /** One batched INSERT into the append-only audit table (QIN-R-5, QIN-DD-6). No rows, no statement. */
  async insertAudit(
    rows: readonly QaIntakeAuditRow[],
    manager: QaQueryExecutor,
  ): Promise<void> {
    if (rows.length === 0) return;
    await manager.query(
      `INSERT INTO \`result_qa_intake_log\`
  (result_id, action, phase_year, platform_id, platform_acronym)
VALUES ${rows.map(() => '(?, ?, ?, ?, ?)').join(', ')}`,
      rows.flatMap((row) => [
        row.result_id,
        row.action,
        row.phase_year,
        row.platform_id,
        row.platform_acronym,
      ]),
    );
  }
}
