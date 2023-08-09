import { MigrationInterface, QueryRunner } from 'typeorm';

export class createIsDiscontinuedColumn1690913116215
  implements MigrationInterface
{
  name = 'createIsDiscontinuedColumn1690913116215';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`is_discontinued\` tinyint NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP COLUMN \`is_discontinued\``,
    );
  }
}
