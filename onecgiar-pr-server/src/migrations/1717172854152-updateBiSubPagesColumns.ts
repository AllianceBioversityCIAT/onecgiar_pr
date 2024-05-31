import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateBiSubPagesColumns1717172854152
  implements MigrationInterface
{
  name = 'UpdateBiSubPagesColumns1717172854152';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bi_subpages\` DROP COLUMN \`section_name\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bi_subpages\` DROP COLUMN \`section_name_code\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bi_subpages\` ADD \`page_displayName\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bi_subpages\` ADD \`page_name\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bi_subpages\` ADD \`report_id\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bi_subpages\` ADD CONSTRAINT \`FK_6a2650855855891b8c3f85056cc\` FOREIGN KEY (\`report_id\`) REFERENCES \`bi_reports\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bi_subpages\` DROP FOREIGN KEY \`FK_6a2650855855891b8c3f85056cc\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bi_subpages\` DROP COLUMN \`report_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bi_subpages\` DROP COLUMN \`page_name\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bi_subpages\` DROP COLUMN \`page_displayName\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`bi_subpages\` ADD \`section_name_code\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`bi_subpages\` ADD \`section_name\` text NOT NULL`,
    );
  }
}
