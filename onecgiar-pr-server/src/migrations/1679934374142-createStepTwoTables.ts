import { MigrationInterface, QueryRunner } from "typeorm";

export class createStepTwoTables1679934374142 implements MigrationInterface {
    name = 'createStepTwoTables1679934374142'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`complementary_innovation_enabler_types\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`complementary_innovation_enabler_types_id\` bigint NOT NULL AUTO_INCREMENT, \`group\` text NULL, \`type\` text NULL, PRIMARY KEY (\`complementary_innovation_enabler_types_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`results_innovatio_packages_enabler_type\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`results_innovatio_packages_enabler_type_id\` bigint NOT NULL AUTO_INCREMENT, \`result_by_innovation_package_id\` bigint NOT NULL, \`complementary_innovation_enable_type_id\` bigint NOT NULL, PRIMARY KEY (\`results_innovatio_packages_enabler_type_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`complementary_innovation_functions\` (\`complementary_innovation_functions_id\` bigint NOT NULL AUTO_INCREMENT, \`name\` text NULL, PRIMARY KEY (\`complementary_innovation_functions_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`results_complementary_innovations_function\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`results_complementary_innovations_function_id\` bigint NOT NULL AUTO_INCREMENT, \`result_complementary_innovation_id\` bigint NOT NULL, \`complementary_innovation_function_id\` bigint NOT NULL, PRIMARY KEY (\`results_complementary_innovations_function_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`results_complementary_innovation\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_complementary_innovation_id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`short_title\` text NULL, \`other_funcions\` text NULL, PRIMARY KEY (\`result_complementary_innovation_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`results_innovatio_packages_enabler_type\` ADD CONSTRAINT \`FK_93e8ebd9447a48c3f49f963ec85\` FOREIGN KEY (\`complementary_innovation_enable_type_id\`) REFERENCES \`complementary_innovation_enabler_types\`(\`complementary_innovation_enabler_types_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_innovatio_packages_enabler_type\` ADD CONSTRAINT \`FK_1660c4e5f73bde3ea8b36157010\` FOREIGN KEY (\`result_by_innovation_package_id\`) REFERENCES \`result_innovation_package\`(\`result_innovation_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_innovatio_packages_enabler_type\` ADD CONSTRAINT \`FK_bd436cbd72d34f1be8e61e51966\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_complementary_innovations_function\` ADD CONSTRAINT \`FK_e4752cc7cc870f330b0aa483bc7\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_complementary_innovations_function\` ADD CONSTRAINT \`FK_3a94b402cba659a55d0e107cd40\` FOREIGN KEY (\`result_complementary_innovation_id\`) REFERENCES \`results_complementary_innovation\`(\`result_complementary_innovation_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_complementary_innovations_function\` ADD CONSTRAINT \`FK_e0d02b052f4d1140b875190afbe\` FOREIGN KEY (\`complementary_innovation_function_id\`) REFERENCES \`complementary_innovation_functions\`(\`complementary_innovation_functions_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_complementary_innovation\` ADD CONSTRAINT \`FK_174ba9e704fa7b2885179a27c1b\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_complementary_innovation\` ADD CONSTRAINT \`FK_4550aee4458fbb9b3a5e606dba0\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_complementary_innovation\` DROP FOREIGN KEY \`FK_4550aee4458fbb9b3a5e606dba0\``);
        await queryRunner.query(`ALTER TABLE \`results_complementary_innovation\` DROP FOREIGN KEY \`FK_174ba9e704fa7b2885179a27c1b\``);
        await queryRunner.query(`ALTER TABLE \`results_complementary_innovations_function\` DROP FOREIGN KEY \`FK_e0d02b052f4d1140b875190afbe\``);
        await queryRunner.query(`ALTER TABLE \`results_complementary_innovations_function\` DROP FOREIGN KEY \`FK_3a94b402cba659a55d0e107cd40\``);
        await queryRunner.query(`ALTER TABLE \`results_complementary_innovations_function\` DROP FOREIGN KEY \`FK_e4752cc7cc870f330b0aa483bc7\``);
        await queryRunner.query(`ALTER TABLE \`results_innovatio_packages_enabler_type\` DROP FOREIGN KEY \`FK_bd436cbd72d34f1be8e61e51966\``);
        await queryRunner.query(`ALTER TABLE \`results_innovatio_packages_enabler_type\` DROP FOREIGN KEY \`FK_1660c4e5f73bde3ea8b36157010\``);
        await queryRunner.query(`ALTER TABLE \`results_innovatio_packages_enabler_type\` DROP FOREIGN KEY \`FK_93e8ebd9447a48c3f49f963ec85\``);
        await queryRunner.query(`DROP TABLE \`results_complementary_innovation\``);
        await queryRunner.query(`DROP TABLE \`results_complementary_innovations_function\``);
        await queryRunner.query(`DROP TABLE \`complementary_innovation_functions\``);
        await queryRunner.query(`DROP TABLE \`results_innovatio_packages_enabler_type\``);
        await queryRunner.query(`DROP TABLE \`complementary_innovation_enabler_types\``);
    }

}
