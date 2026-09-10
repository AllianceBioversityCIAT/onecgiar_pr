import { MigrationInterface, QueryRunner } from 'typeorm';

export class TocContributorsPartnersExtensions1782834331506
  implements MigrationInterface
{
  name = 'TocContributorsPartnersExtensions1782834331506';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` ADD \`from_toc\` tinyint NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result\` ADD \`has_innovation_link\` tinyint NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result\` DROP COLUMN \`has_innovation_link\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`results_by_institution\` DROP COLUMN \`from_toc\``,
    );
  }
}
