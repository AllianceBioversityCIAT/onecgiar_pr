import { MigrationInterface, QueryRunner } from 'typeorm';

export class refactorTocPhaseId1689196099518 implements MigrationInterface {
  name = 'refactorTocPhaseId1689196099518';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`version\` DROP COLUMN \`toc_pahse_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` ADD \`toc_pahse_id\` varchar(50) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`version\` DROP COLUMN \`toc_pahse_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` ADD \`toc_pahse_id\` bigint NULL`,
    );
  }
}
