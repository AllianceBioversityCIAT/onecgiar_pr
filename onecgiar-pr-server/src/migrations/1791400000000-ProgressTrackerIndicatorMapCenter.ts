import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Center-aware Progress Tracker indicator mapping.
 *
 * One ToC indicator can carry targets for several centers, and PT keeps one KPI per
 * (indicator, center). The map therefore moves from one row per
 * (`toc_results_indicator_id`, `version_id`) to one row per
 * (`toc_results_indicator_id`, `version_id`, `center`), and gains:
 *   - `center` — the PRMS-side center acronym (what the runtime lookup keys on). `''` when
 *     the indicator has no center target.
 *   - `kpi_type` — the ToC indicator's `type_value`.
 *   - `needs_review` — set by the fill when the match is weak or ambiguous.
 *
 * ## Existing rows are deleted
 *
 * Rows written before this migration carry no center and were resolved against
 * `MIN(center)`, so they cannot be attributed to a center after the fact. They are
 * deleted, not backfilled; the admin `/resolve` fill re-creates them. `down` deletes the
 * center-keyed rows for the same reason — several rows per (indicator, version) would
 * violate the restored two-column key.
 *
 * Key width: `toc_results_indicator_id(255)` (1020 bytes) + `version_id` (8) +
 * `center` varchar(64) (256) stays under the 3072-byte InnoDB limit at utf8mb4.
 *
 * Re-runnable: every column and index change checks `information_schema` first.
 */
export class ProgressTrackerIndicatorMapCenter1791400000000
  implements MigrationInterface
{
  name = 'ProgressTrackerIndicatorMapCenter1791400000000';

  private static readonly TABLE = 'progress_tracker_indicator_map';
  private static readonly OLD_UNIQUE = 'IDX_ptim_toc_indicator_version';
  private static readonly NEW_UNIQUE = 'IDX_ptim_toc_indicator_version_center';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = ProgressTrackerIndicatorMapCenter1791400000000.TABLE;

    await queryRunner.query(`DELETE FROM \`${table}\`;`);

    if (!(await this.columnExists(queryRunner, 'center'))) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` ADD \`center\` varchar(64) NOT NULL DEFAULT '' COMMENT 'PRMS-side center acronym (clarisa_institutions.acronym); empty when the indicator has no center target.'`,
      );
    }
    if (!(await this.columnExists(queryRunner, 'kpi_type'))) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` ADD \`kpi_type\` varchar(255) NULL COMMENT 'The ToC indicator type_value.'`,
      );
    }
    if (!(await this.columnExists(queryRunner, 'needs_review'))) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` ADD \`needs_review\` tinyint NOT NULL DEFAULT 0 COMMENT 'Weak fuzzy match, tied top candidates, or no match.'`,
      );
    }

    if (
      await this.indexExists(
        queryRunner,
        ProgressTrackerIndicatorMapCenter1791400000000.OLD_UNIQUE,
      )
    ) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` DROP INDEX \`${ProgressTrackerIndicatorMapCenter1791400000000.OLD_UNIQUE}\``,
      );
    }
    if (
      !(await this.indexExists(
        queryRunner,
        ProgressTrackerIndicatorMapCenter1791400000000.NEW_UNIQUE,
      ))
    ) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` ADD UNIQUE INDEX \`${ProgressTrackerIndicatorMapCenter1791400000000.NEW_UNIQUE}\` (\`toc_results_indicator_id\`(255), \`version_id\`, \`center\`)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = ProgressTrackerIndicatorMapCenter1791400000000.TABLE;

    // Several center rows per (indicator, version) would collide with the restored key.
    await queryRunner.query(`DELETE FROM \`${table}\`;`);

    if (
      await this.indexExists(
        queryRunner,
        ProgressTrackerIndicatorMapCenter1791400000000.NEW_UNIQUE,
      )
    ) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` DROP INDEX \`${ProgressTrackerIndicatorMapCenter1791400000000.NEW_UNIQUE}\``,
      );
    }
    if (
      !(await this.indexExists(
        queryRunner,
        ProgressTrackerIndicatorMapCenter1791400000000.OLD_UNIQUE,
      ))
    ) {
      await queryRunner.query(
        `ALTER TABLE \`${table}\` ADD UNIQUE INDEX \`${ProgressTrackerIndicatorMapCenter1791400000000.OLD_UNIQUE}\` (\`toc_results_indicator_id\`(255), \`version_id\`)`,
      );
    }

    for (const column of ['needs_review', 'kpi_type', 'center']) {
      if (await this.columnExists(queryRunner, column)) {
        await queryRunner.query(
          `ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``,
        );
      }
    }
  }

  private async columnExists(
    queryRunner: QueryRunner,
    column: string,
  ): Promise<boolean> {
    const rows: { total: number }[] = await queryRunner.query(
      `
        SELECT COUNT(*) AS total
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND COLUMN_NAME = ?;
      `,
      [ProgressTrackerIndicatorMapCenter1791400000000.TABLE, column],
    );

    return Number(rows?.[0]?.total ?? 0) > 0;
  }

  private async indexExists(
    queryRunner: QueryRunner,
    index: string,
  ): Promise<boolean> {
    const rows: { total: number }[] = await queryRunner.query(
      `
        SELECT COUNT(*) AS total
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
          AND INDEX_NAME = ?;
      `,
      [ProgressTrackerIndicatorMapCenter1791400000000.TABLE, index],
    );

    return Number(rows?.[0]?.total ?? 0) > 0;
  }
}
