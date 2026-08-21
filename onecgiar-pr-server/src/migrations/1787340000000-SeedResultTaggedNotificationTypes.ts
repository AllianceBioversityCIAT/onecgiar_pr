import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * P2-3214 — notification types for a Science Program tagging a centre or a bilateral project
 * on a result.
 *
 * `notifications_type` rows have historically been inserted by hand per environment, so the
 * numeric ids are NOT consistent across environments. The code resolves these rows by their
 * `type` string (see `NotificationService.emitResultNotification`), never by id — and these
 * INSERTs are guarded so re-running against an environment where someone already added the
 * rows manually is a no-op.
 */
export class SeedResultTaggedNotificationTypes1787340000000
  implements MigrationInterface
{
  private static readonly TYPES = [
    'Result Center Tagged',
    'Result Bilateral Project Tagged',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const type of SeedResultTaggedNotificationTypes1787340000000.TYPES) {
      await queryRunner.query(
        `
        INSERT INTO \`notifications_type\` (type)
        SELECT ?
        WHERE NOT EXISTS (
          SELECT 1 FROM \`notifications_type\` WHERE type = ?
        )
      `,
        [type, type],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Deliberately narrower than the sibling P2-3157 seed migration, whose `down()` deletes by
    // `type` outright and so would also drop rows an environment inserted by hand. A type that
    // any notification still references is left alone: dropping it would either break the FK or
    // orphan real user-facing rows, and re-running `up()` would not bring the notifications back.
    for (const type of SeedResultTaggedNotificationTypes1787340000000.TYPES) {
      await queryRunner.query(
        `
        DELETE FROM \`notifications_type\`
        WHERE type = ?
          AND NOT EXISTS (
            SELECT 1
            FROM \`notification\` n
            WHERE n.notification_type = \`notifications_type\`.notifications_type_id
          )
      `,
        [type],
      );
    }
  }
}
