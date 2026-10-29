// @akili-spec quality-assurance/qa-intake
import { Injectable } from '@nestjs/common';
import { ResultStatusData } from '../../shared/constants/result-status.enum';
import { QaIntakeAction } from './qa-intake.constants';
import { PHASE_APP_MODULE_IDS, QaQueryExecutor } from './qa-results.repository';

const SUBMITTED_STATUS_ID = ResultStatusData.Submitted.value;
const QUALITY_ASSESSED_STATUS_ID = ResultStatusData.QualityAssessed.value;

/** One `result_qa_intake_log` row (design section 5). `created_date` is the DB's clock: never sent. */
export interface QaIntakeAuditRow {
  result_id: number;
  action: QaIntakeAction;
  phase_year: number;
  platform_id: number;
  platform_acronym: string;
}

/** What release reads under the lock (QIN-R-4): the state its reasons and its CAS predicate are derived from. */
export interface QaReleaseLockedRow {
  in_qa: boolean;
  status_id: number | null;
  /** The row's version is in the requested phase year (Reporting or IPSR module). */
  in_phase: boolean;
}

const placeholders = (n: number) => Array(n).fill('?').join(', ');

/**
 * QIN-DD-3: the write-side statements of intake and release. Every method takes the
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

  /**
   * Release's locked read (QIN-R-4): the same `SELECT ... FOR UPDATE` on the batch's `result` rows, but it reads what release's
   * reasons need: `in_qa`, `status_id` and whether the row's version is in the requested phase year. The phase is an EXISTS
   * subquery, not a JOIN: a locking read does not lock rows of a subquery, so no shared `version` row is held for the batch.
   * Same phase predicate as `classify` (`PHASE_APP_MODULE_IDS`), but independent of `status_id`: classify checks status first,
   * release checks the phase first (QIN-R-4 reason order). An id with no row is absent from the map.
   */
  async lockRowsForRelease(
    ids: readonly number[],
    phaseYear: number,
    manager: QaQueryExecutor,
  ): Promise<Map<number, QaReleaseLockedRow>> {
    if (ids.length === 0) return new Map();
    const rows: {
      id: number;
      in_qa: number | boolean | null;
      status_id: number | null;
      in_phase: number | boolean | null;
    }[] = await manager.query(
      `SELECT r.id AS id, r.in_qa AS in_qa, r.status_id AS status_id,
  EXISTS (
    SELECT 1
      FROM \`version\` v
     WHERE v.id = r.version_id AND v.phase_year = ? AND v.app_module_id IN (${placeholders(PHASE_APP_MODULE_IDS.length)})
  ) AS in_phase
FROM \`result\` r
WHERE r.id IN (${placeholders(ids.length)})
ORDER BY r.id ASC
FOR UPDATE`,
      [phaseYear, ...PHASE_APP_MODULE_IDS, ...ids],
    );
    return new Map(
      rows.map((row) => [
        Number(row.id),
        {
          in_qa: Number(row.in_qa) === 1,
          status_id: row.status_id === null ? null : Number(row.status_id),
          in_phase: Number(row.in_phase) === 1,
        },
      ]),
    );
  }

  /**
   * Outcome `qaed` (QIN-R-4, QIN-DD-9): `in_qa` back to 0 and `status_id` 3 -> 2. `status` is not written (3 308 of 3 345
   * status-2 rows carry the Submitted value already). The predicate re-states the state the caller derived under the lock
   * (QIN-DD-11: In QA and Submitted); the count is rows MATCHED, which equals rows changed because `in_qa = 1` is in the
   * WHERE and `in_qa = 0` in the SET. The caller asserts it (QIN-R-8).
   */
  async releaseQaed(
    ids: readonly number[],
    manager: QaQueryExecutor,
  ): Promise<number> {
    return this.casRelease(
      `status_id = ${QUALITY_ASSESSED_STATUS_ID}, in_qa = 0`,
      ids,
      manager,
    );
  }

  /** Outcome `not_qaed` (QIN-R-4): only `in_qa` goes back to 0; `status_id` stays 3, so no `status_id` in the SET. */
  async releaseNotQaed(
    ids: readonly number[],
    manager: QaQueryExecutor,
  ): Promise<number> {
    return this.casRelease('in_qa = 0', ids, manager);
  }

  /** `set` is a trusted literal from the two callers above, never input. Every id is bound. */
  private async casRelease(
    set: string,
    ids: readonly number[],
    manager: QaQueryExecutor,
  ): Promise<number> {
    if (ids.length === 0) return 0;
    const res = await manager.query(
      `UPDATE \`result\`
SET ${set}
WHERE id IN (${placeholders(ids.length)})
  AND is_active = 1
  AND status_id = ${SUBMITTED_STATUS_ID}
  AND in_qa = 1`,
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
