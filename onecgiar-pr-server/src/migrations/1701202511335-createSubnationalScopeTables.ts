import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubnationalScopeTables1701202511335
  implements MigrationInterface
{
  name = 'CreateSubnationalScopeTables1701202511335';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`clarisa_subnational_scopes\` (\`id\` bigint NOT NULL, \`code\` varchar(255) NOT NULL, \`name\` text NULL, \`country_id\` bigint NULL, \`local_name\` text NULL, \`other_names\` json NULL, \`language_iso_2\` text NULL, \`country_iso_alpha_2\` text NULL, \`romanization_system_name\` text NULL, \`subnational_category_name\` text NULL, \`is_active\` tinyint NOT NULL, UNIQUE INDEX \`IDX_4c6193f1486b1bc634da981e93\` (\`code\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`result_country_subnational\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_country_subnational_id\` bigint NOT NULL AUTO_INCREMENT, \`result_country_id\` bigint NOT NULL, \`clarisa_subnational_scope_code\` varchar(255) NOT NULL, PRIMARY KEY (\`result_country_subnational_id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_country_subnational\` ADD CONSTRAINT \`FK_9cd848b34ec56f5e74161e2c854\` FOREIGN KEY (\`result_country_id\`) REFERENCES \`result_country\`(\`result_country_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_country_subnational\` ADD CONSTRAINT \`FK_1e1efef16a732f8bf6da8c48558\` FOREIGN KEY (\`clarisa_subnational_scope_code\`) REFERENCES \`clarisa_subnational_scopes\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`result_country_subnational\` DROP FOREIGN KEY \`FK_1e1efef16a732f8bf6da8c48558\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`result_country_subnational\` DROP FOREIGN KEY \`FK_9cd848b34ec56f5e74161e2c854\``,
    );
    await queryRunner.query(`DROP TABLE \`result_country_subnational\``);
    await queryRunner.query(
      `DROP INDEX \`IDX_4c6193f1486b1bc634da981e93\` ON \`clarisa_subnational_scopes\``,
    );
    await queryRunner.query(`DROP TABLE \`clarisa_subnational_scopes\``);
  }
}

