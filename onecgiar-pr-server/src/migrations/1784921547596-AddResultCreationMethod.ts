import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddResultCreationMethod1784921547596
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `result` ADD `creation_method` varchar(20) NOT NULL DEFAULT 'UNKNOWN'",
    );
    await queryRunner.query(
      "UPDATE `result` SET `creation_method` = CASE WHEN `source` = 'API' THEN 'EXTERNAL' WHEN `source` = 'Result' THEN 'MANUAL' ELSE 'UNKNOWN' END",
    );
    await queryRunner.query(
      'CREATE INDEX `idx_result_creation_method` ON `result` (`creation_method`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `idx_result_creation_method` ON `result`',
    );
    await queryRunner.query(
      'ALTER TABLE `result` DROP COLUMN `creation_method`',
    );
  }
}
