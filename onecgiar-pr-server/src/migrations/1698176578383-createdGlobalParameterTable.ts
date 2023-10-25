import { MigrationInterface, QueryRunner } from 'typeorm';

export class createdGlobalParameterTable1698176578383
  implements MigrationInterface
{
  name = 'createdGlobalParameterTable1698176578383';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`global_parameters\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(64) NOT NULL, \`description\` text NULL, \`value\` text NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_by\` int NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`last_updated_by\` int NULL, UNIQUE INDEX \`IDX_ed56900977659dec40883a4867\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_ed56900977659dec40883a4867\` ON \`global_parameters\``,
    );
    await queryRunner.query(`DROP TABLE \`global_parameters\``);
  }
}
