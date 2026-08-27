import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProgramInvestedFinancialResourcesToTocResult1782835122815
  implements MigrationInterface
{
  name = 'AddProgramInvestedFinancialResourcesToTocResult1782835122815';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_toc_result\` ADD \`program_invested_financial_resources\` tinyint NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_toc_result\` DROP COLUMN \`program_invested_financial_resources\``,
    );
  }
}
