import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClarisaPortfolioEntity1752855040861
  implements MigrationInterface
{
  name = 'AddClarisaPortfolioEntity1752855040861';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`clarisa_portfolios\` (\`id\` int NOT NULL, \`name\` text NULL, \`start_date\` year NULL, \`end_date\` year NULL, \`is_active\` tinyint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`clarisa_portfolios\``);
  }
}
