import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBilateralDraftResultStatus1784919268056
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`result_status\` (status_name, status_description)
      SELECT 'Draft', 'Bilateral AI draft status'
      WHERE NOT EXISTS (
        SELECT 1
        FROM \`result_status\`
        WHERE status_name = 'Draft'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`result_status\`
      WHERE status_name = 'Draft'
        AND status_description = 'Bilateral AI draft status'
    `);
  }
}
