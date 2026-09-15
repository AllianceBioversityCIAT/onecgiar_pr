import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `APF-T-1` (M2) — `bilateral-ai/ai-processing-feedback`. Notification type for a bilateral AI
 * job reaching a terminal state (`COMPLETED` with or without drafts, `FAILED`, or a late
 * `COMPLETED` after `TIMED_OUT`) — `APF-R-4`, `APF-DD-4`.
 *
 * Same rules as `1788720000000-SeedBilateralSubmittedNotificationType` /
 * `1787254200000-SeedBilateralReviewNotificationTypes`: `notifications_type` ids are NOT
 * consistent across environments, the row is resolved by its `type` string
 * (`NotificationTypeEnum.BILATERAL_AI_JOB_FINISHED`), and the row is written directly by the new
 * `emitBilateralAiJobNotification` (design.md §6.4) — not through `emitResultNotification`,
 * because a job notification has no result to hang the row on. The INSERT is guarded so
 * re-running against an environment where the row already exists is a no-op.
 */
export class AddBilateralAiJobFinishedNotificationType1788761000000
  implements MigrationInterface
{
  name = 'AddBilateralAiJobFinishedNotificationType1788761000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`notifications_type\` (type)
      SELECT 'Bilateral AI Job Finished'
      WHERE NOT EXISTS (
        SELECT 1
        FROM \`notifications_type\`
        WHERE type = 'Bilateral AI Job Finished'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`notifications_type\`
      WHERE type = 'Bilateral AI Job Finished'
    `);
  }
}
