import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2-3157 — notification types for the bilateral review decision (Approve / Reject).
 *
 * `notifications_type` rows have historically been inserted by hand per environment, so the
 * numeric ids are NOT consistent across environments. The code resolves these rows by their
 * `type` string (see NotificationService.emitResultNotification), never by id — and these
 * INSERTs are guarded so re-running against an environment where someone already added the
 * rows manually is a no-op.
 */
export class SeedBilateralReviewNotificationTypes1787254200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`notifications_type\` (type)
      SELECT 'Bilateral Result Approved'
      WHERE NOT EXISTS (
        SELECT 1
        FROM \`notifications_type\`
        WHERE type = 'Bilateral Result Approved'
      )
    `);

    await queryRunner.query(`
      INSERT INTO \`notifications_type\` (type)
      SELECT 'Bilateral Result Rejected'
      WHERE NOT EXISTS (
        SELECT 1
        FROM \`notifications_type\`
        WHERE type = 'Bilateral Result Rejected'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`notifications_type\`
      WHERE type IN ('Bilateral Result Approved', 'Bilateral Result Rejected')
    `);
  }
}
