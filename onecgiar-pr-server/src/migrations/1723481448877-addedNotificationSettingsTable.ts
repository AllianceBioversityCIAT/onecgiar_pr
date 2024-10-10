import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserNotificationSettingsWithBaseEntity1723478250328
  implements MigrationInterface
{
  name = 'UpdateUserNotificationSettingsWithBaseEntity1723478250328';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`user_notification_settings\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT, 
        \`user_id\` int NOT NULL, 
        \`initiative_id\` int NOT NULL,
        \`email_notifications_contributing_request_enabled\` boolean NOT NULL DEFAULT 0, 
        \`email_notifications_updates_enabled\` boolean NOT NULL DEFAULT 0,
        \`is_active\` boolean NOT NULL DEFAULT 1,
        \`created_date\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`last_updated_date\` timestamp NULL DEFAULT NULL,
        \`created_by\` bigint NULL,
        \`last_updated_by\` bigint NULL,
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_user_id\` (\`user_id\`),
        INDEX \`IDX_initiative_id\` (\`initiative_id\`)
      ) ENGINE=InnoDB`,
    );

    await queryRunner.query(
      `ALTER TABLE \`user_notification_settings\` 
      ADD CONSTRAINT \`FK_user_notification_user_id\` 
      FOREIGN KEY (\`user_id\`) 
      REFERENCES \`users\`(\`id\`) 
      ON DELETE CASCADE 
      ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE \`user_notification_settings\` 
      ADD CONSTRAINT \`FK_user_notification_initiative_id\` 
      FOREIGN KEY (\`initiative_id\`) 
      REFERENCES \`clarisa_initiatives\`(\`id\`) 
      ON DELETE CASCADE 
      ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`user_notification_settings\` 
      DROP FOREIGN KEY \`FK_user_notification_user_id\``,
    );

    await queryRunner.query(
      `ALTER TABLE \`user_notification_settings\` 
      DROP FOREIGN KEY \`FK_user_notification_initiative_id\``,
    );

    await queryRunner.query(
      `DROP INDEX \`IDX_user_id\` ON \`user_notification_settings\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_initiative_id\` ON \`user_notification_settings\``,
    );
    await queryRunner.query(`DROP TABLE \`user_notification_settings\``);
  }
}
