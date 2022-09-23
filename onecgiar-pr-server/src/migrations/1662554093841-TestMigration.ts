import { MigrationInterface, QueryRunner } from 'typeorm';

export class TestMigration1662554093841 implements MigrationInterface {
  name = 'TestMigration1662554093841';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`complementary_data_users\` CHANGE \`active\` \`active\` tinyint NOT NULL DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`complementary_data_users\` CHANGE \`active\` \`active\` tinyint NOT NULL`,
    );
  }
}
