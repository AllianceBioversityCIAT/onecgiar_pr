import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedAcronymFieldforPorfolio1754067489100
  implements MigrationInterface
{
  name = 'AddedAcronymFieldforPorfolio1754067489100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_portfolios\` ADD \`acronym\` text NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_portfolios\` DROP COLUMN \`acronym\``,
    );
  }
}
