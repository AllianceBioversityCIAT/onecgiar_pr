import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddedShareResultMapToTocParam1724940050655
  implements MigrationInterface
{
  name = 'AddedShareResultMapToTocParam1724940050655';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`share_result_request\` ADD \`is_map_to_toc\` tinyint NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`share_result_request\` DROP COLUMN \`is_map_to_toc\``,
    );
  }
}
