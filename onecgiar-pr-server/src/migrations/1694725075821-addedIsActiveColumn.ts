import { MigrationInterface, QueryRunner } from 'typeorm';

export class addedIsActiveColumn1694725075821 implements MigrationInterface {
  name = 'addedIsActiveColumn1694725075821';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_type\` ADD \`is_active\` tinyint NULL DEFAULT 1`,
    );
    await queryRunner.query(`update \`result_type\` set is_active = 1`);
    await queryRunner.query(
      `update \`result_type\` set is_active = 0 where id = 3`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_type\` DROP COLUMN \`is_active\``,
    );
  }
}
