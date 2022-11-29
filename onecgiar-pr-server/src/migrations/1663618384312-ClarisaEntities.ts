import { MigrationInterface, QueryRunner } from 'typeorm';

export class ClarisaEntities1663618384312 implements MigrationInterface {
  name = 'ClarisaEntities1663618384312';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`clarisa_outcome_indicators\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` int NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`smo_code\` text NULL, \`outcome_indicator_statement\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`clarisa_countries\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` int NULL, \`id\` int NOT NULL, \`name\` text NOT NULL, \`iso_alpha_2\` text NOT NULL, \`iso_alpha_3\` text NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`clarisa_regions_types\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` int NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`description\` text NULL, \`active\` tinyint NOT NULL DEFAULT 1, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`clarisa_regions\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` int NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`iso_numeric\` int NULL, \`acronym\` text NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`region_type_id\` int NULL, \`parent_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`clarisa_countries_regions\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` int NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`active\` tinyint NOT NULL DEFAULT 1, \`country_id\` int NULL, \`region_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `CREATE TABLE \`institution_types\` (\`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`updated_by\` int NULL, \`id\` int NOT NULL AUTO_INCREMENT, \`name\` text NOT NULL, \`acronym\` text NULL, \`sub_department_active\` int NOT NULL, \`old\` int NULL, \`description\` text NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` DROP COLUMN \`outcomeId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` DROP COLUMN \`outcomeIndicatorId\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_impact_areas\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_impact_areas\` ADD \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_impact_areas\` ADD \`updated_by\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_global_targets\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_global_targets\` ADD \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_global_targets\` ADD \`updated_by\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` ADD \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` ADD \`updated_by\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` ADD \`outcome_id\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` ADD \`outcome_indicator_id\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_area\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_area\` ADD \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_area\` ADD \`updated_by\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_melia_study_type\` ADD \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_melia_study_type\` ADD \`updated_at\` datetime(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_melia_study_type\` ADD \`updated_by\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_melia_study_type\` ADD \`active\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_impact_area_indicator\` CHANGE \`indicator_statement\` \`indicator_statement\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_impact_area_indicator\` CHANGE \`target_unit\` \`target_unit\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_impact_area_indicator\` CHANGE \`value\` \`value\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` CHANGE \`outcome_indicator_smo_code\` \`outcome_indicator_smo_code\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` CHANGE \`outcome_indicator_statement\` \`outcome_indicator_statement\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` ADD CONSTRAINT \`FK_7de34124fca17393e863f4d76fc\` FOREIGN KEY (\`outcome_indicator_id\`) REFERENCES \`clarisa_outcome_indicators\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_regions\` ADD CONSTRAINT \`FK_07d9d9b15641695d67999a61721\` FOREIGN KEY (\`region_type_id\`) REFERENCES \`clarisa_regions_types\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_regions\` ADD CONSTRAINT \`FK_8da69263529cc6a8668e99bd630\` FOREIGN KEY (\`parent_id\`) REFERENCES \`clarisa_regions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries_regions\` ADD CONSTRAINT \`FK_1aa06ba82f6e1560f3a909dcb6e\` FOREIGN KEY (\`country_id\`) REFERENCES \`clarisa_countries\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries_regions\` ADD CONSTRAINT \`FK_9c1808663bdbd6c932fb056e964\` FOREIGN KEY (\`region_id\`) REFERENCES \`clarisa_regions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries_regions\` DROP FOREIGN KEY \`FK_9c1808663bdbd6c932fb056e964\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_countries_regions\` DROP FOREIGN KEY \`FK_1aa06ba82f6e1560f3a909dcb6e\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_regions\` DROP FOREIGN KEY \`FK_8da69263529cc6a8668e99bd630\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_regions\` DROP FOREIGN KEY \`FK_07d9d9b15641695d67999a61721\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` DROP FOREIGN KEY \`FK_7de34124fca17393e863f4d76fc\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` CHANGE \`outcome_indicator_statement\` \`outcome_indicator_statement\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` CHANGE \`outcome_indicator_smo_code\` \`outcome_indicator_smo_code\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_impact_area_indicator\` CHANGE \`value\` \`value\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_impact_area_indicator\` CHANGE \`target_unit\` \`target_unit\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_impact_area_indicator\` CHANGE \`indicator_statement\` \`indicator_statement\` text NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_melia_study_type\` DROP COLUMN \`active\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_melia_study_type\` DROP COLUMN \`updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_melia_study_type\` DROP COLUMN \`updated_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_melia_study_type\` DROP COLUMN \`created_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_area\` DROP COLUMN \`updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_area\` DROP COLUMN \`updated_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_area\` DROP COLUMN \`created_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` DROP COLUMN \`outcome_indicator_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` DROP COLUMN \`outcome_id\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` DROP COLUMN \`updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` DROP COLUMN \`updated_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` DROP COLUMN \`created_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_global_targets\` DROP COLUMN \`updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_global_targets\` DROP COLUMN \`updated_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_global_targets\` DROP COLUMN \`created_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_impact_areas\` DROP COLUMN \`updated_by\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_impact_areas\` DROP COLUMN \`updated_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_impact_areas\` DROP COLUMN \`created_at\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` ADD \`outcomeIndicatorId\` int NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`clarisa_action_areas_outcomes_indicators\` ADD \`outcomeId\` int NOT NULL`,
    );
    await queryRunner.query(`DROP TABLE \`institution_types\``);
    await queryRunner.query(`DROP TABLE \`clarisa_countries_regions\``);
    await queryRunner.query(`DROP TABLE \`clarisa_regions\``);
    await queryRunner.query(`DROP TABLE \`clarisa_regions_types\``);
    await queryRunner.query(`DROP TABLE \`clarisa_countries\``);
    await queryRunner.query(`DROP TABLE \`clarisa_outcome_indicators\``);
  }
}
