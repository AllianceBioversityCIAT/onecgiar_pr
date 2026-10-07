import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `RRC-T-4` — bilateral/rejected-result-correction, design.md §6 / `RRC-DD-6` / `RRC-R-13`.
 *
 * Adds `notifications.review_history_id bigint NULL` + index + FK ->
 * `result_review_history(id)` `ON DELETE SET NULL`, so a notification can point at the review
 * history row whose comment (the rejection justification) the readout joins in. `NULL` means a
 * legacy or non-review notification.
 *
 * The table is `notifications` (plural; entity `@Entity('notifications')`, created in
 * 1725650935514). The column type is `bigint` SIGNED because `result_review_history.id` is
 * `bigint NOT NULL AUTO_INCREMENT` (RRC-P-12; original DDL in
 * 1768572302006-AuditoryTableApproveRejectBilaterals.ts) — MySQL rejects an FK whose type or
 * signedness differs from the referenced PK.
 *
 * The four futures (repo rule 25):
 *   - Applied without the new code: an inert NULL column; nothing reads or writes it.
 *   - Code without it: reading/writing `review_history_id` would fail — the previous code
 *     does neither.
 *   - Applied twice: column, index and FK are each created only if absent.
 *   - Reverted: `down` drops FK, then index, then column, each only if present. Dropping the
 *     column loses only the link, never the notification or the history row.
 */
export class NotificationReviewHistoryLink1790700000000
  implements MigrationInterface
{
  name = 'NotificationReviewHistoryLink1790700000000';

  private static readonly TABLE = 'notifications';
  private static readonly COLUMN = 'review_history_id';
  private static readonly FK = 'FK_notifications_review_history';
  private static readonly INDEX = 'IDX_notifications_review_history';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const t = NotificationReviewHistoryLink1790700000000;

    if (!(await this.columnExists(queryRunner))) {
      await queryRunner.query(
        `ALTER TABLE \`${t.TABLE}\` ADD \`${t.COLUMN}\` bigint NULL`,
      );
    }

    if (!(await this.indexExists(queryRunner))) {
      await queryRunner.query(
        `CREATE INDEX \`${t.INDEX}\` ON \`${t.TABLE}\` (\`${t.COLUMN}\`)`,
      );
    }

    if (!(await this.foreignKeyExists(queryRunner))) {
      await queryRunner.query(
        `ALTER TABLE \`${t.TABLE}\` ADD CONSTRAINT \`${t.FK}\` FOREIGN KEY (\`${t.COLUMN}\`) REFERENCES \`result_review_history\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const t = NotificationReviewHistoryLink1790700000000;

    // FK before index: MySQL needs the index while the FK exists.
    if (await this.foreignKeyExists(queryRunner)) {
      await queryRunner.query(
        `ALTER TABLE \`${t.TABLE}\` DROP FOREIGN KEY \`${t.FK}\``,
      );
    }
    if (await this.indexExists(queryRunner)) {
      await queryRunner.query(`DROP INDEX \`${t.INDEX}\` ON \`${t.TABLE}\``);
    }
    if (await this.columnExists(queryRunner)) {
      await queryRunner.query(
        `ALTER TABLE \`${t.TABLE}\` DROP COLUMN \`${t.COLUMN}\``,
      );
    }
  }

  private async columnExists(queryRunner: QueryRunner): Promise<boolean> {
    const t = NotificationReviewHistoryLink1790700000000;
    const rows: unknown[] = await queryRunner.query(
      `SELECT 1 FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [t.TABLE, t.COLUMN],
    );
    return rows.length > 0;
  }

  private async indexExists(queryRunner: QueryRunner): Promise<boolean> {
    const t = NotificationReviewHistoryLink1790700000000;
    const rows: unknown[] = await queryRunner.query(
      `SELECT 1 FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [t.TABLE, t.INDEX],
    );
    return rows.length > 0;
  }

  private async foreignKeyExists(queryRunner: QueryRunner): Promise<boolean> {
    const t = NotificationReviewHistoryLink1790700000000;
    const rows: unknown[] = await queryRunner.query(
      `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
         AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
      [t.TABLE, t.FK],
    );
    return rows.length > 0;
  }
}
