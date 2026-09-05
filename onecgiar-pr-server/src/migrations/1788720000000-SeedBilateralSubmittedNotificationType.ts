import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 2026-09-05 — notification type for "a bilateral result was submitted for your review".
 *
 * The Science Program used to learn about a new Pending Review result only through the
 * review-queue counter; this row backs the in-app notification its members now receive, emitted
 * from both entry paths (the centre form's Submit and the API ingest).
 *
 * Same rules as `1787254200000-SeedBilateralReviewNotificationTypes`: `notifications_type` ids are
 * NOT consistent across environments, the code resolves the row by its `type` string
 * (NotificationService.emitResultNotification), and the INSERT is guarded so re-running against an
 * environment where the row already exists is a no-op.
 */
export class SeedBilateralSubmittedNotificationType1788720000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`notifications_type\` (type)
      SELECT 'Bilateral Result Submitted'
      WHERE NOT EXISTS (
        SELECT 1
        FROM \`notifications_type\`
        WHERE type = 'Bilateral Result Submitted'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`notifications_type\`
      WHERE type = 'Bilateral Result Submitted'
    `);
  }
}
