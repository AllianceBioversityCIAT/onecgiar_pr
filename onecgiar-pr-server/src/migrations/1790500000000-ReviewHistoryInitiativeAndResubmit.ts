import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `RSB-T-1` — bilateral/resubmit-rejected-result, design.md §5 / `RSB-DD-9`.
 *
 * Two changes on `result_review_history`, each independently guarded:
 *
 *   1. `initiative_id int NULL` + FK -> `clarisa_initiatives(id)` + index, so every history
 *      entry can carry the Science Program involved (`RSB-R-18`). Rows from before this spec
 *      keep it NULL.
 *   2. `action` becomes `ENUM('APPROVE','REJECT','UPDATE','RESUBMIT') NOT NULL`. The REAL
 *      current enum is `('APPROVE','REJECT','UPDATE')` (verified by query, 2026-10-06 — the
 *      original table migration only declared the first two). `up` is written against those
 *      three; it only widens the enum, so no stored value changes.
 *
 * The four futures (repo rule 25):
 *   - Applied without the new code: an inert NULL column and an unused enum value.
 *   - Code without it: saving `initiative_id` / `'RESUBMIT'` would fail — nothing in the
 *     previous code writes either.
 *   - Applied twice: column, index and FK are created only if absent; re-running the enum
 *     MODIFY to the same definition is a no-op.
 *   - Reverted: `down` first converts `RESUBMIT` rows to `UPDATE` (the closest surviving
 *     value) so the enum can shrink back to the 3 real values, then drops FK, index and
 *     column, in dependency order.
 */
export class ReviewHistoryInitiativeAndResubmit1790500000000
  implements MigrationInterface
{
  name = 'ReviewHistoryInitiativeAndResubmit1790500000000';

  private static readonly TABLE = 'result_review_history';
  private static readonly COLUMN = 'initiative_id';
  private static readonly FK = 'FK_result_review_history_initiative';
  private static readonly INDEX = 'IDX_result_review_history_initiative';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const t = ReviewHistoryInitiativeAndResubmit1790500000000;

    if (!(await this.columnExists(queryRunner))) {
      await queryRunner.query(
        `ALTER TABLE \`${t.TABLE}\` ADD \`${t.COLUMN}\` int NULL`,
      );
    }

    if (!(await this.indexExists(queryRunner))) {
      await queryRunner.query(
        `CREATE INDEX \`${t.INDEX}\` ON \`${t.TABLE}\` (\`${t.COLUMN}\`)`,
      );
    }

    if (!(await this.foreignKeyExists(queryRunner))) {
      await queryRunner.query(
        `ALTER TABLE \`${t.TABLE}\` ADD CONSTRAINT \`${t.FK}\` FOREIGN KEY (\`${t.COLUMN}\`) REFERENCES \`clarisa_initiatives\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
      );
    }

    await queryRunner.query(
      `ALTER TABLE \`${t.TABLE}\` MODIFY \`action\` ENUM('APPROVE','REJECT','UPDATE','RESUBMIT') NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const t = ReviewHistoryInitiativeAndResubmit1790500000000;

    // The enum cannot lose a value that rows still use.
    await queryRunner.query(
      `UPDATE \`${t.TABLE}\` SET \`action\` = 'UPDATE' WHERE \`action\` = 'RESUBMIT'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`${t.TABLE}\` MODIFY \`action\` ENUM('APPROVE','REJECT','UPDATE') NOT NULL`,
    );

    // FK before index: MySQL needs the index while the FK exists.
    if (await this.foreignKeyExists(queryRunner)) {
      await queryRunner.query(
        `ALTER TABLE \`${t.TABLE}\` DROP FOREIGN KEY \`${t.FK}\``,
      );
    }
    if (await this.indexExists(queryRunner)) {
      await queryRunner.query(
        `DROP INDEX \`${t.INDEX}\` ON \`${t.TABLE}\``,
      );
    }
    if (await this.columnExists(queryRunner)) {
      await queryRunner.query(
        `ALTER TABLE \`${t.TABLE}\` DROP COLUMN \`${t.COLUMN}\``,
      );
    }
  }

  private async columnExists(queryRunner: QueryRunner): Promise<boolean> {
    const t = ReviewHistoryInitiativeAndResubmit1790500000000;
    const rows: unknown[] = await queryRunner.query(
      `SELECT 1 FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [t.TABLE, t.COLUMN],
    );
    return rows.length > 0;
  }

  private async indexExists(queryRunner: QueryRunner): Promise<boolean> {
    const t = ReviewHistoryInitiativeAndResubmit1790500000000;
    const rows: unknown[] = await queryRunner.query(
      `SELECT 1 FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [t.TABLE, t.INDEX],
    );
    return rows.length > 0;
  }

  private async foreignKeyExists(queryRunner: QueryRunner): Promise<boolean> {
    const t = ReviewHistoryInitiativeAndResubmit1790500000000;
    const rows: unknown[] = await queryRunner.query(
      `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
         AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
      [t.TABLE, t.FK],
    );
    return rows.length > 0;
  }
}
