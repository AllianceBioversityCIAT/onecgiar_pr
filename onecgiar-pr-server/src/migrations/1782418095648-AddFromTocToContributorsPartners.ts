import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFromTocToContributorsPartners1782418095648
  implements MigrationInterface
{
  name = 'AddFromTocToContributorsPartners1782418095648';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_center\` ADD \`from_toc\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` ADD \`from_toc\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`share_result_request\` ADD \`from_toc\` tinyint NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`share_result_request\` DROP COLUMN \`from_toc\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_inititiative\` DROP COLUMN \`from_toc\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_center\` DROP COLUMN \`from_toc\``,
    );
  }
}
