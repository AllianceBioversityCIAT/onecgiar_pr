import { MigrationInterface, QueryRunner } from 'typeorm';

export class createdGlobalParameterAndCategoryTable1698355025434
  implements MigrationInterface
{
  name = 'createdGlobalParameterAndCategoryTable1698355025434';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`global_parameter_categories\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(64) NOT NULL, \`description\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`global_narratives\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`global_parameters\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(64) NOT NULL, \`description\` text NULL, \`value\` text NULL, \`global_parameter_categories_id\` bigint NOT NULL, UNIQUE INDEX \`IDX_ed56900977659dec40883a4867\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_parameters\` ADD CONSTRAINT \`FK_d9a0bc8b3ce1168756711504c14\` FOREIGN KEY (\`global_parameter_categories_id\`) REFERENCES \`global_parameter_categories\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`global_parameters\` DROP FOREIGN KEY \`FK_d9a0bc8b3ce1168756711504c14\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_ed56900977659dec40883a4867\` ON \`global_parameters\``,
    );
    await queryRunner.query(`DROP TABLE \`global_parameters\``);
    await queryRunner.query(`DROP TABLE \`global_parameter_categories\``);
  }
}
