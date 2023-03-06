import { MigrationInterface, QueryRunner } from "typeorm";

export class test1678128833482 implements MigrationInterface {
    name = 'test1678128833482'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`non_pooled_package_project\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`create_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_update_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`create_by\` bigint NULL, \`last_update_by\` bigint NULL, \`non_pooled_package_project_id\` bigint NOT NULL AUTO_INCREMENT, \`grant_title\` text NOT NULL, \`center_grant_id\` text NOT NULL, \`results_package_id\` bigint NOT NULL, \`lead_center_id\` varchar(255) NOT NULL, \`funder_institution_id\` int NOT NULL, PRIMARY KEY (\`non_pooled_package_project_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`results_package_center\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`create_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_update_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`create_by\` bigint NULL, \`last_update_by\` bigint NULL, \`results_package_center_id\` bigint NOT NULL AUTO_INCREMENT, \`is_primary\` tinyint NULL, \`center_id\` varchar(255) NOT NULL, \`result_package_id\` bigint NOT NULL, PRIMARY KEY (\`results_package_center_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`result_innovation_package\` (\`result_innovation_package_id\` bigint NOT NULL AUTO_INCREMENT, PRIMARY KEY (\`result_innovation_package_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`results_package_by_initiative\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`create_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_update_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`create_by\` bigint NULL, \`last_update_by\` bigint NULL, \`results_package_by_initiative_id\` bigint NOT NULL AUTO_INCREMENT, \`initiative_id\` int NOT NULL, \`initiative_role_id\` bigint NOT NULL, \`results_package_id\` bigint NOT NULL, PRIMARY KEY (\`results_package_by_initiative_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`results_package_toc_result\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`create_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_update_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`create_by\` bigint NULL, \`last_update_by\` bigint NULL, \`results_package_toc_result_id\` bigint NOT NULL AUTO_INCREMENT, \`toc_result_id\` int NOT NULL, \`results_package_id\` bigint NOT NULL, \`planned_result_packages\` tinyint NOT NULL, PRIMARY KEY (\`results_package_toc_result_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_package_project\` ADD CONSTRAINT \`FK_da7d36a9a09c6a86587acbb000e\` FOREIGN KEY (\`results_package_id\`) REFERENCES \`result_innovation_package\`(\`result_innovation_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_package_project\` ADD CONSTRAINT \`FK_7b905151ec5e08f2bbcef1a1319\` FOREIGN KEY (\`lead_center_id\`) REFERENCES \`clarisa_center\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_package_project\` ADD CONSTRAINT \`FK_7a4f5463545fe31c569cec5481a\` FOREIGN KEY (\`funder_institution_id\`) REFERENCES \`clarisa_institutions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_package_project\` ADD CONSTRAINT \`FK_6b0bde1ba8bf5558c8031c62162\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_package_center\` ADD CONSTRAINT \`FK_40c61ea0429a0eca532cf3a3568\` FOREIGN KEY (\`center_id\`) REFERENCES \`clarisa_center\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_package_center\` ADD CONSTRAINT \`FK_64aaf99588bf1e1d4ff2fb06a00\` FOREIGN KEY (\`result_package_id\`) REFERENCES \`result_innovation_package\`(\`result_innovation_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_package_center\` ADD CONSTRAINT \`FK_4411c4971586ca39311b2e797b8\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_package_by_initiative\` ADD CONSTRAINT \`FK_6c84c8d7cd96d2820ec9f0f72ee\` FOREIGN KEY (\`results_package_id\`) REFERENCES \`result_innovation_package\`(\`result_innovation_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_package_by_initiative\` ADD CONSTRAINT \`FK_4a3775a48d1f2b43e4d8af12ac2\` FOREIGN KEY (\`initiative_role_id\`) REFERENCES \`initiative_roles\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_package_by_initiative\` ADD CONSTRAINT \`FK_d8e9bac8038150cf18ea47a2676\` FOREIGN KEY (\`initiative_id\`) REFERENCES \`clarisa_initiatives\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_package_by_initiative\` ADD CONSTRAINT \`FK_32d59e6a03d1a90c869c865b77d\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_package_toc_result\` ADD CONSTRAINT \`FK_9f4b581a3ab3e65691ad3564c1a\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_package_toc_result\` ADD CONSTRAINT \`FK_634ea96738994b29cfabe574d38\` FOREIGN KEY (\`results_package_id\`) REFERENCES \`result_innovation_package\`(\`result_innovation_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_package_toc_result\` ADD CONSTRAINT \`FK_98c13e22773e5b16cde56320935\` FOREIGN KEY (\`toc_result_id\`) REFERENCES \`toc_result\`(\`toc_result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_package_toc_result\` DROP FOREIGN KEY \`FK_98c13e22773e5b16cde56320935\``);
        await queryRunner.query(`ALTER TABLE \`results_package_toc_result\` DROP FOREIGN KEY \`FK_634ea96738994b29cfabe574d38\``);
        await queryRunner.query(`ALTER TABLE \`results_package_toc_result\` DROP FOREIGN KEY \`FK_9f4b581a3ab3e65691ad3564c1a\``);
        await queryRunner.query(`ALTER TABLE \`results_package_by_initiative\` DROP FOREIGN KEY \`FK_32d59e6a03d1a90c869c865b77d\``);
        await queryRunner.query(`ALTER TABLE \`results_package_by_initiative\` DROP FOREIGN KEY \`FK_d8e9bac8038150cf18ea47a2676\``);
        await queryRunner.query(`ALTER TABLE \`results_package_by_initiative\` DROP FOREIGN KEY \`FK_4a3775a48d1f2b43e4d8af12ac2\``);
        await queryRunner.query(`ALTER TABLE \`results_package_by_initiative\` DROP FOREIGN KEY \`FK_6c84c8d7cd96d2820ec9f0f72ee\``);
        await queryRunner.query(`ALTER TABLE \`results_package_center\` DROP FOREIGN KEY \`FK_4411c4971586ca39311b2e797b8\``);
        await queryRunner.query(`ALTER TABLE \`results_package_center\` DROP FOREIGN KEY \`FK_64aaf99588bf1e1d4ff2fb06a00\``);
        await queryRunner.query(`ALTER TABLE \`results_package_center\` DROP FOREIGN KEY \`FK_40c61ea0429a0eca532cf3a3568\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_package_project\` DROP FOREIGN KEY \`FK_6b0bde1ba8bf5558c8031c62162\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_package_project\` DROP FOREIGN KEY \`FK_7a4f5463545fe31c569cec5481a\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_package_project\` DROP FOREIGN KEY \`FK_7b905151ec5e08f2bbcef1a1319\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_package_project\` DROP FOREIGN KEY \`FK_da7d36a9a09c6a86587acbb000e\``);
        await queryRunner.query(`DROP TABLE \`results_package_toc_result\``);
        await queryRunner.query(`DROP TABLE \`results_package_by_initiative\``);
        await queryRunner.query(`DROP TABLE \`result_innovation_package\``);
        await queryRunner.query(`DROP TABLE \`results_package_center\``);
        await queryRunner.query(`DROP TABLE \`non_pooled_package_project\``);
    }

}
