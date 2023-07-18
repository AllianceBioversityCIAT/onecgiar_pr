import { MigrationInterface, QueryRunner } from 'typeorm';

export class refactorVersion1687447605674 implements MigrationInterface {
  name = 'refactorVersion1687447605674';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`version\` ADD \`app_module_id\` bigint NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` ADD CONSTRAINT \`FK_a72fb2135da57a18d74a0deb9ce\` FOREIGN KEY (\`app_module_id\`) REFERENCES \`application_modules\`(\`app_module_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`version\` DROP FOREIGN KEY \`FK_a72fb2135da57a18d74a0deb9ce\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`version\` DROP COLUMN \`app_module_id\``,
    );
  }
}
