import { MigrationInterface, QueryRunner } from 'typeorm';

export class refactorClarisaRegionsType1663885930445
  implements MigrationInterface
{
  name = 'refactorClarisaRegionsType1663885930445';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_regions_types\` DROP COLUMN \`active\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_regions_types\` ADD \`active\` tinyint NOT NULL DEFAULT '1'`,
    );
  }
}
