import { MigrationInterface, QueryRunner } from 'typeorm';

export class TestMigration1662554287081 implements MigrationInterface {
  name = 'TestMigration1662554287081';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` CHANGE \`active\` \`active\` tinyint NOT NULL DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` CHANGE \`active\` \`active\` tinyint NOT NULL`,
    );
  }
}
