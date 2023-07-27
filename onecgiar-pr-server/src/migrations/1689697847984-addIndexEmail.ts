import { MigrationInterface, QueryRunner } from 'typeorm';

export class addIndexEmail1689697847984 implements MigrationInterface {
  name = 'addIndexEmail1689697847984';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`temp_email\` text NOT NULL`,
    );
    await queryRunner.query(`update \`users\` set temp_email = email`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`temp_email\``);
  }
}
