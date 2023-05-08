import { MigrationInterface, QueryRunner } from "typeorm";

export class createdTablesBudgetAndRelations1681394530103 implements MigrationInterface {
    name = 'createdTablesBudgetAndRelations1681394530103'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_institutions_budget\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_institutions_budget_id\` bigint NOT NULL AUTO_INCREMENT, \`result_institution_id\` bigint NOT NULL, \`current_year\` bigint NULL, \`next_year\` bigint NULL, \`is_determined\` tinyint NULL, PRIMARY KEY (\`result_institutions_budget_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`result_initiative_budget\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_initiative_budget_id\` bigint NOT NULL AUTO_INCREMENT, \`result_initiative_id\` int NOT NULL, \`current_year\` bigint NULL, \`next_year\` bigint NULL, \`is_determined\` tinyint NULL, PRIMARY KEY (\`result_initiative_budget_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`non_pooled_projetct_budget\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`non_pooled_projetct_budget_id\` bigint NOT NULL AUTO_INCREMENT, \`non_pooled_projetct_id\` int NOT NULL, \`current_year\` bigint NULL, \`next_year\` bigint NULL, \`is_determined\` tinyint NULL, PRIMARY KEY (\`non_pooled_projetct_budget_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`non_pooled_project_type\` (\`non_pooled_project_type_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(45) NOT NULL, PRIMARY KEY (\`non_pooled_project_type_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`unit_time\` (\`unit_time_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(45) NOT NULL, PRIMARY KEY (\`unit_time_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` ADD \`non_pooled_project_type_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`initiative_expected_time\` varchar(45) NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`initiative_unit_time_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`bilateral_expected_time\` varchar(45) NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`bilateral_unit_time_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`partner_expected_time\` varchar(45) NULL`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`partner_unit_time_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD \`evidence_type_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` ADD CONSTRAINT \`FK_0894e64ad6d902792c052f352ab\` FOREIGN KEY (\`result_institution_id\`) REFERENCES \`results_by_institution\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` ADD CONSTRAINT \`FK_e284436427133a3d72d92c96317\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_initiative_budget\` ADD CONSTRAINT \`FK_7b115d36071bab25bbdf88fb0c9\` FOREIGN KEY (\`result_initiative_id\`) REFERENCES \`results_by_inititiative\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_initiative_budget\` ADD CONSTRAINT \`FK_645f70263b533adde1ff6e52e3f\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` ADD CONSTRAINT \`FK_d3a109bf4f7424589fe3768943a\` FOREIGN KEY (\`non_pooled_projetct_id\`) REFERENCES \`non_pooled_project\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` ADD CONSTRAINT \`FK_15c85e2230379a1ee6c9c622c7f\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` ADD CONSTRAINT \`FK_d8d6375c2945c7f582e65de0b25\` FOREIGN KEY (\`non_pooled_project_type_id\`) REFERENCES \`non_pooled_project_type\`(\`non_pooled_project_type_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_2ede9be87ca83782648382b6e99\` FOREIGN KEY (\`initiative_unit_time_id\`) REFERENCES \`unit_time\`(\`unit_time_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_2b40f313d010d2f0438ef53fecc\` FOREIGN KEY (\`bilateral_unit_time_id\`) REFERENCES \`unit_time\`(\`unit_time_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD CONSTRAINT \`FK_aab4eb17dbdc15083e17c1d3448\` FOREIGN KEY (\`partner_unit_time_id\`) REFERENCES \`unit_time\`(\`unit_time_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD CONSTRAINT \`FK_69a169c80bcc2700c0e641fd570\` FOREIGN KEY (\`evidence_type_id\`) REFERENCES \`evidence_types\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP FOREIGN KEY \`FK_69a169c80bcc2700c0e641fd570\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_aab4eb17dbdc15083e17c1d3448\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_2b40f313d010d2f0438ef53fecc\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP FOREIGN KEY \`FK_2ede9be87ca83782648382b6e99\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` DROP FOREIGN KEY \`FK_d8d6375c2945c7f582e65de0b25\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` DROP FOREIGN KEY \`FK_15c85e2230379a1ee6c9c622c7f\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` DROP FOREIGN KEY \`FK_d3a109bf4f7424589fe3768943a\``);
        await queryRunner.query(`ALTER TABLE \`result_initiative_budget\` DROP FOREIGN KEY \`FK_645f70263b533adde1ff6e52e3f\``);
        await queryRunner.query(`ALTER TABLE \`result_initiative_budget\` DROP FOREIGN KEY \`FK_7b115d36071bab25bbdf88fb0c9\``);
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` DROP FOREIGN KEY \`FK_e284436427133a3d72d92c96317\``);
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` DROP FOREIGN KEY \`FK_0894e64ad6d902792c052f352ab\``);
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP COLUMN \`evidence_type_id\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`partner_unit_time_id\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`partner_expected_time\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`bilateral_unit_time_id\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`bilateral_expected_time\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`initiative_unit_time_id\``);
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`initiative_expected_time\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` DROP COLUMN \`non_pooled_project_type_id\``);
        await queryRunner.query(`DROP TABLE \`unit_time\``);
        await queryRunner.query(`DROP TABLE \`non_pooled_project_type\``);
        await queryRunner.query(`DROP TABLE \`non_pooled_projetct_budget\``);
        await queryRunner.query(`DROP TABLE \`result_initiative_budget\``);
        await queryRunner.query(`DROP TABLE \`result_institutions_budget\``);
    }

}
