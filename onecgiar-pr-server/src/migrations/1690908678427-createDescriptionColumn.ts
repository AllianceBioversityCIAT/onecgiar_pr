import { MigrationInterface, QueryRunner } from 'typeorm';

export class createDescriptionColumn1690908678427
  implements MigrationInterface
{
  name = 'createDescriptionColumn1690908678427';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_investment_discontinued_options\` ADD \`description\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_investment_discontinued_options\` DROP COLUMN \`description\``,
    );
  }
}
