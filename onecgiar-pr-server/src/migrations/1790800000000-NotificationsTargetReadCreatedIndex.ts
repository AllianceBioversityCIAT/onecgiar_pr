import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `PPG-T-1` — notifications/admin-pending-paging, design.md §5 / `PPG-DD-7` / `PPG-R-9`.
 *
 * Adds the composite index `IDX_notifications_target_read_created` on
 * `notifications(target_user, read, created_date, notification_id)` so the paged inbox/bell
 * reads are served by the index. Created online (`ALGORITHM=INPLACE, LOCK=NONE`, MySQL 8):
 * reads and writes on `notifications` continue while it builds.
 *
 * The four futures (repo rule 25):
 *   - Applied without the new code: the index is only an access path; nothing depends on it.
 *   - Code without it: queries still work, just slower.
 *   - Applied twice: the index is created only if absent.
 *   - Reverted: `down` drops exactly this index, only if present. No data is lost.
 */
export class NotificationsTargetReadCreatedIndex1790800000000
  implements MigrationInterface
{
  name = 'NotificationsTargetReadCreatedIndex1790800000000';

  private static readonly TABLE = 'notifications';
  private static readonly INDEX = 'IDX_notifications_target_read_created';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const t = NotificationsTargetReadCreatedIndex1790800000000;
    if (await this.indexExists(queryRunner)) return;
    await queryRunner.query(
      `CREATE INDEX \`${t.INDEX}\` ON \`${t.TABLE}\` (\`target_user\`, \`read\`, \`created_date\`, \`notification_id\`) ALGORITHM=INPLACE LOCK=NONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const t = NotificationsTargetReadCreatedIndex1790800000000;
    if (!(await this.indexExists(queryRunner))) return;
    await queryRunner.query(`DROP INDEX \`${t.INDEX}\` ON \`${t.TABLE}\``);
  }

  private async indexExists(queryRunner: QueryRunner): Promise<boolean> {
    const t = NotificationsTargetReadCreatedIndex1790800000000;
    const rows: unknown[] = await queryRunner.query(
      `SELECT 1 FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [t.TABLE, t.INDEX],
    );
    return rows.length > 0;
  }
}
