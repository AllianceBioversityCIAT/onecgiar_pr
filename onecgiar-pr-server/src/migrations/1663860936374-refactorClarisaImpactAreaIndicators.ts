import { MigrationInterface, QueryRunner } from 'typeorm';

export class refactorClarisaImpactAreaIndicators1663860936374
  implements MigrationInterface
{
  name = 'refactorClarisaImpactAreaIndicators1663860936374';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_impact_area_indicator\` ADD \`name\` text NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_impact_area_indicator\` DROP COLUMN \`name\``,
    );
  }
}
