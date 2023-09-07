import { MigrationInterface, QueryRunner } from 'typeorm';

export class addedStatusId1689796437631 implements MigrationInterface {
  name = 'addedStatusId1689796437631';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`submission\` ADD \`status_id\` bigint NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`submission\` DROP COLUMN \`status_id\``,
    );
  }
}
