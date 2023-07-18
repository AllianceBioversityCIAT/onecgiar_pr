import { MigrationInterface, QueryRunner } from 'typeorm';

export class addedNewApplicationModuleTable1687445803898
  implements MigrationInterface
{
  name = 'addedNewApplicationModuleTable1687445803898';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`application_modules\` (\`app_module_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp NULL, PRIMARY KEY (\`app_module_id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`application_modules\``);
  }
}
