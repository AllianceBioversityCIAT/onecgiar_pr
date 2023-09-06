import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCgSpaceFlagForCenters1692370807707
  implements MigrationInterface
{
  name = 'AddCgSpaceFlagForCenters1692370807707';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_center\` ADD \`from_cgspace\` tinyint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_center\` DROP COLUMN \`from_cgspace\``,
    );
  }
}
