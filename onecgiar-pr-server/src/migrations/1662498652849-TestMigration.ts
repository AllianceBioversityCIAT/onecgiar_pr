import { MigrationInterface, QueryRunner } from 'typeorm';

export class TestMigration1662498652849 implements MigrationInterface {
  name = 'TestMigration1662498652849';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`role\` (\`id\` int NOT NULL AUTO_INCREMENT, \`description\` text NOT NULL, \`scope\` text NOT NULL, \`scope_id\` int NOT NULL, \`active\` tinyint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`roles_user_by_aplication\` (\`id\` int NOT NULL AUTO_INCREMENT, \`active\` tinyint NOT NULL, \`user_id\` int NULL, \`roleId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`first_name\` text NOT NULL, \`last_name\` text NOT NULL, \`email\` text NOT NULL, \`active\` tinyint NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`complementary_data_users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`is_cgiar\` tinyint NOT NULL, \`password\` text NULL, \`last_login\` timestamp NULL, \`active\` tinyint NOT NULL, \`user_id\` int NULL, UNIQUE INDEX \`REL_c244ce5f37df7f3475f88184e1\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`clarisa_action_area\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`description\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`clarisa_action_areas_outcomes_indicators\` (\`id\` int NOT NULL AUTO_INCREMENT, \`outcomeId\` int NOT NULL, \`outcome_smo_code\` text NOT NULL, \`outcome_statement\` text NOT NULL, \`outcomeIndicatorId\` int NOT NULL, \`outcome_indicator_smo_code\` text NOT NULL, \`outcome_indicator_statement\` text NOT NULL, \`action_area_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`clarisa_global_targets\` (\`id\` int NOT NULL AUTO_INCREMENT, \`target\` text NOT NULL, \`impact_area_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`clarisa_impact_areas\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`description\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`clarisa_impact_area_indicator\` (\`id\` int NOT NULL AUTO_INCREMENT, \`indicator_statement\` text NOT NULL, \`target_year\` int NOT NULL, \`target_unit\` text NOT NULL, \`value\` int NOT NULL, \`is_aplicable_projected_benefits\` tinyint NOT NULL, \`impact_area_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`clarisa_melia_study_type\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`clarisa_institutions\` (\`id\` int NOT NULL AUTO_INCREMENT, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles_user_by_aplication\` ADD CONSTRAINT \`FK_d457d1cc436edbcaf351d002d02\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles_user_by_aplication\` ADD CONSTRAINT \`FK_07aa3bde74ce010f1736462e505\` FOREIGN KEY (\`roleId\`) REFERENCES \`role\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`complementary_data_users\` ADD CONSTRAINT \`FK_c244ce5f37df7f3475f88184e1c\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` ADD CONSTRAINT \`FK_93c77252693ec1998a3336bf6c5\` FOREIGN KEY (\`action_area_id\`) REFERENCES \`clarisa_action_area\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_global_targets\` ADD CONSTRAINT \`FK_adbcfdd27fb4523599f288cc5f6\` FOREIGN KEY (\`impact_area_id\`) REFERENCES \`clarisa_impact_areas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_impact_area_indicator\` ADD CONSTRAINT \`FK_5f494f087f37427697e312bf887\` FOREIGN KEY (\`impact_area_id\`) REFERENCES \`clarisa_impact_areas\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_impact_area_indicator\` DROP FOREIGN KEY \`FK_5f494f087f37427697e312bf887\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_global_targets\` DROP FOREIGN KEY \`FK_adbcfdd27fb4523599f288cc5f6\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` DROP FOREIGN KEY \`FK_93c77252693ec1998a3336bf6c5\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`complementary_data_users\` DROP FOREIGN KEY \`FK_c244ce5f37df7f3475f88184e1c\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles_user_by_aplication\` DROP FOREIGN KEY \`FK_07aa3bde74ce010f1736462e505\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`roles_user_by_aplication\` DROP FOREIGN KEY \`FK_d457d1cc436edbcaf351d002d02\``,
    );
    await queryRunner.query(`DROP TABLE \`clarisa_institutions\``);
    await queryRunner.query(`DROP TABLE \`clarisa_melia_study_type\``);
    await queryRunner.query(`DROP TABLE \`clarisa_impact_area_indicator\``);
    await queryRunner.query(`DROP TABLE \`clarisa_impact_areas\``);
    await queryRunner.query(`DROP TABLE \`clarisa_global_targets\``);
    await queryRunner.query(
      `DROP TABLE \`clarisa_action_areas_outcomes_indicators\``,
    );
    await queryRunner.query(`DROP TABLE \`clarisa_action_area\``);
    await queryRunner.query(
      `DROP INDEX \`REL_c244ce5f37df7f3475f88184e1\` ON \`complementary_data_users\``,
    );
    await queryRunner.query(`DROP TABLE \`complementary_data_users\``);
    await queryRunner.query(`DROP TABLE \`users\``);
    await queryRunner.query(`DROP TABLE \`roles_user_by_aplication\``);
    await queryRunner.query(`DROP TABLE \`role\``);
  }
}
