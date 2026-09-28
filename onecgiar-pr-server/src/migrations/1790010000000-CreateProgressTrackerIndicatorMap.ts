// @akili-spec changes/progress-tracker-pull-bridge/progress-tracker-indicator-mapping
import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `PTM-T-1` — the mapping from a ToC indicator (scoped to a reporting **version**) to a
 * Progress Tracker `indicator_id` (`design.md` §3.1, §12 `PTM-DD-2`; `requirements.md`
 * `PTM-R-9`, `PTM-R-21`; `PTM-AC-11`).
 *
 * ## Why `version_id`, never `phase_year` (`P-4`)
 *
 * Two `version` rows can share a `phase_year` while carrying different ToC phase ids
 * (`reporting-toc-context.service.ts:86-91`), and `result` itself keys on `version_id`
 * (`result.entity.ts:266-271`). A year-keyed unique constraint would silently let two
 * different reporting phases collide into one mapping row. The `UNIQUE INDEX` below is
 * keyed on `version_id`, not `phase_year`, on purpose.
 *
 * ## Why both `toc_results_indicator_id` and `toc_indicator_integration_id` exist
 *
 * `toc_results_indicator_id` is the Integration `related_node_id` string, as
 * `results_toc_result_indicators` already stores it — this is the lookup key today.
 * `toc_indicator_integration_id` is the Integration primary key, carried for
 * re-resolution, not for lookup. Which one `PTM-T-3`'s runtime read joins on is that
 * task's decision, not this one's (`design.md` §14 watch item) — this migration keeps
 * both columns so that decision stays open.
 *
 * ## The unique key (`PTM-AC-11`)
 *
 * `toc_results_indicator_id` is `text`, so MySQL requires a prefix length to index it —
 * `(255)` here, well under the 3072-byte InnoDB `DYNAMIC` row-format limit at utf8mb4
 * (255 * 4 = 1020 bytes). `UNIQUE (toc_results_indicator_id(255), version_id)` is what
 * makes the fill routine idempotent: re-running it for the same indicator and version
 * updates the existing row instead of duplicating it, while the same indicator string
 * against a *different* version is a distinct, legitimate row.
 *
 * ## House pattern (`P-12`, mirrored from `1788445000000-CreateInnovationMergeSplitTable.ts`)
 *
 * Raw `queryRunner.query()`, `CREATE TABLE IF NOT EXISTS`, the FK added through a guarded
 * helper that checks `information_schema.TABLE_CONSTRAINTS` first (safe to re-run), and a
 * `down` that refuses to drop the table once it holds rows — a resolved mapping is a
 * statement about which KPI a phase's indicator was matched to, and a `git revert` should
 * not be able to delete that silently.
 *
 * ## The four futures (repo rule 25)
 *   - Applied without the new code: an empty table nobody queries. Inert.
 *   - Code deployed without applying it: `PTM-T-3`/`PTM-T-5` would query/write a table
 *     that does not exist yet. The Jenkins pipeline applies migrations before the backend
 *     serves traffic.
 *   - Applied twice: guarded by `CREATE TABLE IF NOT EXISTS` and the FK-existence check.
 *   - Reverted with rows inside: `down` refuses to drop; the fill must be cleared first or
 *     the revert handled as a forward fix.
 */
export class CreateProgressTrackerIndicatorMap1790010000000
  implements MigrationInterface
{
  name = 'CreateProgressTrackerIndicatorMap1790010000000';

  private static readonly TABLE = 'progress_tracker_indicator_map';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`${CreateProgressTrackerIndicatorMap1790010000000.TABLE}\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`toc_results_indicator_id\` text NOT NULL COMMENT 'The Integration related_node_id string, as results_toc_result_indicators already stores it.',
        \`toc_indicator_integration_id\` bigint NULL COMMENT 'The Integration primary key, carried for re-resolution, not for lookup.',
        \`version_id\` bigint NOT NULL COMMENT 'Reporting version — never phase_year (P-4): two versions can share a phase_year with different ToC phase ids.',
        \`pt_indicator_id\` varchar(32) NULL COMMENT 'Null when unmapped.',
        \`pt_program_id\` varchar(32) NULL,
        \`match_quality\` varchar(16) NOT NULL COMMENT 'exact | fuzzy | none',
        \`match_score\` decimal(5,4) NULL,
        \`resolved_at\` timestamp(6) NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`created_by\` bigint NULL,
        \`last_updated_by\` bigint NULL,
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_ptim_toc_indicator_version\` (\`toc_results_indicator_id\`(255), \`version_id\`),
        INDEX \`IDX_ptim_version\` (\`version_id\`)
      ) ENGINE=InnoDB
    `);

    // Foreign key added separately and guarded: re-running this migration on a database
    // that already has the table must not fail on a duplicate constraint name.
    await this.addForeignKeyIfMissing(
      queryRunner,
      'FK_ptim_version',
      'version_id',
      'version',
      'id',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await this.tableExists(queryRunner))) {
      return;
    }

    const rows: { total: number }[] = await queryRunner.query(
      `SELECT COUNT(*) AS total FROM \`${CreateProgressTrackerIndicatorMap1790010000000.TABLE}\`;`,
    );

    if (Number(rows?.[0]?.total ?? 0) > 0) {
      // A resolved (or explicitly unmapped) mapping row is a statement about which KPI a
      // phase's indicator was matched to. Dropping the table deletes that statement, and
      // nothing brings it back.
      return;
    }

    await queryRunner.query(
      `DROP TABLE IF EXISTS \`${CreateProgressTrackerIndicatorMap1790010000000.TABLE}\`;`,
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
      [CreateProgressTrackerIndicatorMap1790010000000.TABLE, constraint],
    );

    if (Number(rows?.[0]?.total ?? 0) > 0) {
      return;
    }

    await queryRunner.query(`
      ALTER TABLE \`${CreateProgressTrackerIndicatorMap1790010000000.TABLE}\`
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
      [CreateProgressTrackerIndicatorMap1790010000000.TABLE],
    );

    return Number(rows?.[0]?.total ?? 0) > 0;
  }
}
