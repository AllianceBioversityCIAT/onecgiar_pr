import { MigrationInterface, QueryRunner } from 'typeorm';

export class SavingOnlineDate1696621669375 implements MigrationInterface {
  name = 'SavingOnlineDate1696621669375';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_kp_metadata\` ADD \`online_year\` bigint NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_kp_metadata\` DROP COLUMN \`online_year\``,
    );
  }
}
