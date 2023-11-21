import { MigrationInterface, QueryRunner } from 'typeorm';

export class createdGlobalParameterAndCategoryTable1698699514069
  implements MigrationInterface
{
  name = 'createdGlobalParameterAndCategoryTable1698699514069';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`global_parameters\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(64) NOT NULL, \`description\` text NULL, \`value\` text NULL, \`global_parameter_category_id\` bigint NOT NULL, UNIQUE INDEX \`IDX_ed56900977659dec40883a4867\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`global_parameter_categories\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(64) NOT NULL, \`description\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`global_parameters\` ADD CONSTRAINT \`FK_b68dce73ee316da24d525e401b4\` FOREIGN KEY (\`global_parameter_category_id\`) REFERENCES \`global_parameter_categories\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`global_parameters\` DROP FOREIGN KEY \`FK_b68dce73ee316da24d525e401b4\``,
    );
    await queryRunner.query(`DROP TABLE \`global_parameter_categories\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_ed56900977659dec40883a4867\` ON \`global_parameters\``,
    );
    await queryRunner.query(`DROP TABLE \`global_parameters\``);
  }
}

