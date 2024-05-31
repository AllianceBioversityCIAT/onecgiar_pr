import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveResportNameBiSubPagesColumn1717183983123
  implements MigrationInterface
{
  name = 'RemoveResportNameBiSubPagesColumn1717183983123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bi_subpages\` DROP COLUMN \`report_name\``,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`bi_subpages\` ADD \`report_name\` varchar(30) NULL`,
    );
  }
}
