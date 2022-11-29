import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorClarisa1667836064936 implements MigrationInterface {
    name = 'refactorClarisa1667836064936'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`clarisa_action_area_outcome\` (\`outcomeId\` int NOT NULL AUTO_INCREMENT, \`outcomeSMOcode\` text NULL, \`outcomeStatement\` text NULL, PRIMARY KEY (\`outcomeId\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`clarisa_action_area_outcomes_action_area\` (\`clarisa_action_area_outcomes_action_area_id\` int NOT NULL AUTO_INCREMENT, \`action_area_id\` int NULL, \`action_area_outcome_id\` int NULL, PRIMARY KEY (\`clarisa_action_area_outcomes_action_area_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`toc_level\` (\`toc_level_id\` int NOT NULL AUTO_INCREMENT, \`name\` text NULL, \`description\` text NULL, PRIMARY KEY (\`toc_level_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`toc_result\` (\`toc_result_id\` int NOT NULL AUTO_INCREMENT, \`toc_internal_id\` text NULL, \`titel\` text NULL, \`description\` text NULL, \`toc_type_id\` bigint NOT NULL, \`work_package_short_title\` text NULL, \`toc_level_id\` int NULL, \`inititiative_id\` int NULL, PRIMARY KEY (\`toc_result_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`results_toc_result\` (\`result_toc_result_id\` bigint NOT NULL AUTO_INCREMENT, \`planned_result\` tinyint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`toc_result_id\` int NULL, \`results_id\` bigint NULL, \`action_area_outcome_id\` int NULL, \`version_id\` bigint NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`result_toc_result_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_c02a8848d0317d55d1bd882833e\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_geographic_scope\` CHANGE \`id\` \`id\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_geographic_scope\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`clarisa_geographic_scope\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_geographic_scope\` ADD \`id\` int NOT NULL PRIMARY KEY AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`geographic_scope_id\``);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`geographic_scope_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` DROP FOREIGN KEY \`FK_59d96103953820802de1dd60065\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries\` CHANGE \`iso_alpha_2\` \`iso_alpha_2\` varchar(5) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD CONSTRAINT \`FK_c02a8848d0317d55d1bd882833e\` FOREIGN KEY (\`geographic_scope_id\`) REFERENCES \`clarisa_geographic_scope\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`clarisa_action_area_outcomes_action_area\` ADD CONSTRAINT \`FK_8bc5d6d89766892b26b9d030dd1\` FOREIGN KEY (\`action_area_id\`) REFERENCES \`clarisa_action_area\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`clarisa_action_area_outcomes_action_area\` ADD CONSTRAINT \`FK_c6c4e947786b794069f7321844c\` FOREIGN KEY (\`action_area_outcome_id\`) REFERENCES \`clarisa_action_area_outcome\`(\`outcomeId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` ADD CONSTRAINT \`FK_59d96103953820802de1dd60065\` FOREIGN KEY (\`headquarter_country_iso2\`) REFERENCES \`clarisa_countries\`(\`iso_alpha_2\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`toc_result\` ADD CONSTRAINT \`FK_cbe92c521167b656bdc371dfd41\` FOREIGN KEY (\`toc_level_id\`) REFERENCES \`toc_level\`(\`toc_level_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`toc_result\` ADD CONSTRAINT \`FK_286663674628d5351108e32108f\` FOREIGN KEY (\`inititiative_id\`) REFERENCES \`clarisa_initiatives\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` ADD CONSTRAINT \`FK_816352d727b97f80189ebbdfec4\` FOREIGN KEY (\`toc_result_id\`) REFERENCES \`toc_result\`(\`toc_result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` ADD CONSTRAINT \`FK_902013d56003583d5fb7916c672\` FOREIGN KEY (\`results_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` ADD CONSTRAINT \`FK_d7ccce598868bbc2abab46663af\` FOREIGN KEY (\`action_area_outcome_id\`) REFERENCES \`clarisa_action_area_outcome\`(\`outcomeId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` ADD CONSTRAINT \`FK_acc40e6b5fb3746e235618093b4\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` ADD CONSTRAINT \`FK_78c70d51d3b5aec8f61640fa433\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` ADD CONSTRAINT \`FK_47b068aac32303bd3355c48c485\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` DROP FOREIGN KEY \`FK_47b068aac32303bd3355c48c485\``);
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` DROP FOREIGN KEY \`FK_78c70d51d3b5aec8f61640fa433\``);
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` DROP FOREIGN KEY \`FK_acc40e6b5fb3746e235618093b4\``);
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` DROP FOREIGN KEY \`FK_d7ccce598868bbc2abab46663af\``);
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` DROP FOREIGN KEY \`FK_902013d56003583d5fb7916c672\``);
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` DROP FOREIGN KEY \`FK_816352d727b97f80189ebbdfec4\``);
        await queryRunner.query(`ALTER TABLE \`toc_result\` DROP FOREIGN KEY \`FK_286663674628d5351108e32108f\``);
        await queryRunner.query(`ALTER TABLE \`toc_result\` DROP FOREIGN KEY \`FK_cbe92c521167b656bdc371dfd41\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` DROP FOREIGN KEY \`FK_59d96103953820802de1dd60065\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_action_area_outcomes_action_area\` DROP FOREIGN KEY \`FK_c6c4e947786b794069f7321844c\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_action_area_outcomes_action_area\` DROP FOREIGN KEY \`FK_8bc5d6d89766892b26b9d030dd1\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_c02a8848d0317d55d1bd882833e\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries\` CHANGE \`iso_alpha_2\` \`iso_alpha_2\` varchar(5) NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` ADD CONSTRAINT \`FK_59d96103953820802de1dd60065\` FOREIGN KEY (\`headquarter_country_iso2\`) REFERENCES \`clarisa_countries\`(\`iso_alpha_2\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`geographic_scope_id\``);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`geographic_scope_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_geographic_scope\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_geographic_scope\` ADD \`id\` bigint NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`clarisa_geographic_scope\` ADD PRIMARY KEY (\`id\`)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_geographic_scope\` CHANGE \`id\` \`id\` bigint NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD CONSTRAINT \`FK_c02a8848d0317d55d1bd882833e\` FOREIGN KEY (\`geographic_scope_id\`) REFERENCES \`clarisa_geographic_scope\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`DROP TABLE \`results_toc_result\``);
        await queryRunner.query(`DROP TABLE \`toc_result\``);
        await queryRunner.query(`DROP TABLE \`toc_level\``);
        await queryRunner.query(`DROP TABLE \`clarisa_action_area_outcomes_action_area\``);
        await queryRunner.query(`DROP TABLE \`clarisa_action_area_outcome\``);
    }

}
