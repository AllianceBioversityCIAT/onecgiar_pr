// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `PTM-T-6` — where the provenance of a result created from a Progress Tracker proposal
 * is recorded (`design.md` §3.1, §12 `PTM-DD-5`; `requirements.md` `PTM-R-13`,
 * `PTM-R-14`; `PTM-AC-12`).
 *
 * ## Why a dedicated table, and why `pt_indicator_id` is denormalized onto it
 *
 * `PTM-DD-5` rejected both a column on `result` and a parsed narrative tail: the grey-out
 * follow-up and the duplicate rule both need to query provenance **by indicator**, and
 * parsing prose is not a foundation for that. `pt_indicator_id` is therefore carried on
 * this table directly, even though it is also available by joining
 * `progress_tracker_indicator_map` — `PTM-R-13`'s "queryable by indicator" clause means
 * *without* that join, and the `INDEX` below is on `(pt_indicator_id, pt_result_key)` for
 * exactly that read pattern.
 *
 * ## Timestamp trap (from `PTM-T-1`'s review — do not repeat it)
 *
 * `PTM-T-1` landed `1790010000000-CreateProgressTrackerIndicatorMap.ts`, which cleared the
 * prior max (`1790002419754`) by only ~2.1 hours of wall-clock milliseconds. A fresh
 * `Date.now()` taken on 2026-09-22 lands *below* `1790010000000` and would sort this
 * migration *ahead of* the mapping table's — a wrong-order schema that stays invisible in
 * review and only fails at deploy. This file's timestamp (`1790020000000`) is chosen
 * explicitly above `1790010000000`, not from `Date.now()`.
 *
 * ## House pattern (`P-12`, mirrored from `1788445000000-CreateInnovationMergeSplitTable.ts`
 * and `1790010000000-CreateProgressTrackerIndicatorMap.ts`)
 *
 * Raw `queryRunner.query()`, `CREATE TABLE IF NOT EXISTS`, the FK added through a guarded
 * helper that checks `information_schema.TABLE_CONSTRAINTS` first (safe to re-run), and a
 * `down` that refuses to drop the table once it holds rows — a recorded provenance row is
 * a statement about how a result came to exist, and a `git revert` should not be able to
 * delete that silently.
 *
 * ## Verification note (DoD amendment 2026-09-22)
 *
 * No database is reachable from this worktree (no `.env`, Docker down, shared dev `.env`
 * also `ECONNREFUSED`). No `migration:run` / `migration:revert` round trip was performed
 * against a live engine. The unique-index and by-indicator-without-join claims are proven
 * **structurally** in
 * `../api/progress-tracker/entities/progress-tracker-result-provenance.entity.spec.ts`,
 * against a mocked `QueryRunner.query` and a literal expected DDL string written
 * independently of this file — not proof a live engine enforces anything.
 *
 * ## The four futures (repo rule 25)
 *   - Applied without the new code: an empty table nobody queries. Inert.
 *   - Code deployed without applying it: `PTM-T-7`'s write hook would target a table that
 *     does not exist yet. The Jenkins pipeline applies migrations before the backend
 *     serves traffic.
 *   - Applied twice: guarded by `CREATE TABLE IF NOT EXISTS` and the FK-existence check.
 *   - Reverted with rows inside: `down` refuses to drop; provenance is a statement about
 *     how a result was created and no `git revert` should silently erase it.
 */
export class CreateProgressTrackerResultProvenance1790020000000
  implements MigrationInterface
{
  name = 'CreateProgressTrackerResultProvenance1790020000000';

  private static readonly TABLE = 'progress_tracker_result_provenance';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`${CreateProgressTrackerResultProvenance1790020000000.TABLE}\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`result_id\` bigint NOT NULL COMMENT 'The result created from the Progress Tracker proposal.',
        \`pt_result_key\` varchar(64) NOT NULL COMMENT 'The upstream result_key.',
        \`pt_evidence_fingerprint\` varchar(128) NULL COMMENT 'The cache key the duplicate rule will use.',
        \`pt_indicator_id\` varchar(32) NULL COMMENT 'Denormalized so provenance is queryable by indicator without joining progress_tracker_indicator_map (PTM-R-13).',
        \`pt_environment\` varchar(16) NULL COMMENT 'dev | staging | prod',
        \`pt_model\` varchar(64) NULL,
        \`pt_generated_at\` timestamp(6) NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`last_updated_by\` bigint NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_ptrp_indicator_result_key\` (\`pt_indicator_id\`, \`pt_result_key\`),
        INDEX \`IDX_ptrp_result\` (\`result_id\`)
      ) ENGINE=InnoDB
    `);

    // Foreign key added separately and guarded: re-running this migration on a database
    // that already has the table must not fail on a duplicate constraint name.
    await this.addForeignKeyIfMissing(
      queryRunner,
      'FK_ptrp_result',
      'result_id',
      'result',
      'id',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.tableExists(queryRunner))) {
      return;
    }

    const rows: { total: number }[] = await queryRunner.query(
      `SELECT COUNT(*) AS total FROM \`${CreateProgressTrackerResultProvenance1790020000000.TABLE}\`;`,
    );

    if (Number(rows?.[0]?.total ?? 0) > 0) {
      // A provenance row is a statement about how a result came to exist. Dropping the
      // table deletes that statement, and nothing brings it back.
      return;
    }

    await queryRunner.query(
      `DROP TABLE IF EXISTS \`${CreateProgressTrackerResultProvenance1790020000000.TABLE}\`;`,
    );
  }

  private async addForeignKeyIfMissing(
    queryRunner: QueryRunner,
    constraint: string,
    column: string,
    referencedTable: string,
    referencedColumn: string,
  ): Promise<void> {
    const rows: { total: number }[] = await queryRunner.query(
      `
        SELECT COUNT(*) AS total
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND CONSTRAINT_NAME = ?;
      `,
      [CreateProgressTrackerResultProvenance1790020000000.TABLE, constraint],
    );

    if (Number(rows?.[0]?.total ?? 0) > 0) {
      return;
    }

    await queryRunner.query(`
      ALTER TABLE \`${CreateProgressTrackerResultProvenance1790020000000.TABLE}\`
        ADD CONSTRAINT \`${constraint}\`
        FOREIGN KEY (\`${column}\`) REFERENCES \`${referencedTable}\`(\`${referencedColumn}\`)
        ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  private async tableExists(queryRunner: QueryRunner): Promise<boolean> {
    const rows: { total: number }[] = await queryRunner.query(
      `
        SELECT COUNT(*) AS total
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?;
      `,
      [CreateProgressTrackerResultProvenance1790020000000.TABLE],
    );

    return Number(rows?.[0]?.total ?? 0) > 0;
  }
}
