import { MigrationInterface, QueryRunner } from 'typeorm';

export class ActionTypeColumns1696885275474 implements MigrationInterface {
  name = 'ActionTypeColumns1696885275474';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`last_action_type\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`justification_action_type\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP COLUMN \`justification_action_type\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP COLUMN \`last_action_type\``,
    );
  }
}
