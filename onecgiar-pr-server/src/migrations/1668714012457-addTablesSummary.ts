import { MigrationInterface, QueryRunner } from "typeorm";

export class addTablesSummary1668714012457 implements MigrationInterface {
    name = 'addTablesSummary1668714012457'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`capdevs_term\` (\`capdev_term_id\` int NOT NULL AUTO_INCREMENT, \`name\` text NULL, \`term\` text NULL, \`description\` text NULL, PRIMARY KEY (\`capdev_term_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`results_capacity_developments\` (\`result_capacity_developent_id\` int NOT NULL AUTO_INCREMENT, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`result_id\` bigint NOT NULL, \`version_id\` bigint NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, UNIQUE INDEX \`REL_bdc6b6d045732d2aaad277965a\` (\`result_id\`), PRIMARY KEY (\`result_capacity_developent_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`results_innovations_dev\` (\`result_innovation_dev_id\` int NOT NULL AUTO_INCREMENT, \`short_title\` text NULL, \`is_new_variety\` tinyint NULL, \`number_of_varieties\` bigint NULL, \`innovation_developers\` text NULL, \`innovation_collaborators\` text NULL, \`readiness_level\` text NULL, \`evidences_justification\` text NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`results_id\` bigint NOT NULL, \`version_id\` bigint NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, UNIQUE INDEX \`REL_fa16ac80ee7602638c4ecee938\` (\`results_id\`), PRIMARY KEY (\`result_innovation_dev_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`results_innovations_use\` (\`result_innovations_use_measure_id\` int NOT NULL AUTO_INCREMENT, \`male_using\` bigint NULL, \`female_using\` bigint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`results_id\` bigint NOT NULL, \`version_id\` bigint NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, UNIQUE INDEX \`REL_600e71f264a8c0a91819901c48\` (\`results_id\`), PRIMARY KEY (\`result_innovations_use_measure_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`units_of_measure\` (\`unit_of_measure_id\` int NOT NULL AUTO_INCREMENT, \`name\` text NULL, \`description\` text NULL, PRIMARY KEY (\`unit_of_measure_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`results_innovations_use_measures\` (\`result_innovations_use_measure_id\` int NOT NULL AUTO_INCREMENT, \`unit_of_measure\` text NULL, \`quantity\` float NOT NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`result_innovation_use_id\` int NOT NULL, \`unit_of_measure_id\` int NULL, \`version_id\` bigint NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`result_innovations_use_measure_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`results_policy_changes\` (\`result_policy_change_id\` int NOT NULL AUTO_INCREMENT, \`amount\` float NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`result_id\` bigint NOT NULL, \`version_id\` bigint NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, UNIQUE INDEX \`REL_aceba3ca0c26212002bb5d3a32\` (\`result_id\`), PRIMARY KEY (\`result_policy_change_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` ADD CONSTRAINT \`FK_bdc6b6d045732d2aaad277965a8\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` ADD CONSTRAINT \`FK_e7eef5d06d8f5db94933566427b\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` ADD CONSTRAINT \`FK_cb49024b795846bc709a9fbdeae\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` ADD CONSTRAINT \`FK_307353ca544da837bb520d557cc\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` ADD CONSTRAINT \`FK_fa16ac80ee7602638c4ecee9385\` FOREIGN KEY (\`results_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` ADD CONSTRAINT \`FK_e7bbbc6476884ee2e2a655f3df5\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` ADD CONSTRAINT \`FK_180f8c6d73e683fc951e0bdefed\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` ADD CONSTRAINT \`FK_cba91fe82d9f525da1fd73f4dfc\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` ADD CONSTRAINT \`FK_600e71f264a8c0a91819901c487\` FOREIGN KEY (\`results_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` ADD CONSTRAINT \`FK_4d46ef3eec64ae4bbdf0688b7a4\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` ADD CONSTRAINT \`FK_657374b4a70ac935ed7ff070c70\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` ADD CONSTRAINT \`FK_37b617b01784e9360e8f02efab2\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use_measures\` ADD CONSTRAINT \`FK_189d78371b1b0b0d2d0d393ac65\` FOREIGN KEY (\`result_innovation_use_id\`) REFERENCES \`results_innovations_use\`(\`result_innovations_use_measure_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use_measures\` ADD CONSTRAINT \`FK_3190c4871d0cbfe9bd11128e100\` FOREIGN KEY (\`unit_of_measure_id\`) REFERENCES \`units_of_measure\`(\`unit_of_measure_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use_measures\` ADD CONSTRAINT \`FK_b3661483d2b6e269d030f30c65d\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use_measures\` ADD CONSTRAINT \`FK_099c6d8eacde2afb49823e86e55\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use_measures\` ADD CONSTRAINT \`FK_c52369dc2cf7cae932e295f968d\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` ADD CONSTRAINT \`FK_aceba3ca0c26212002bb5d3a320\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` ADD CONSTRAINT \`FK_fcc7e47ef3f168812c8b4bd2ca8\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` ADD CONSTRAINT \`FK_b8f6e66a3c853da4d5d0c7a28e8\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` ADD CONSTRAINT \`FK_f31819fdf774efe7274128f76da\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` DROP FOREIGN KEY \`FK_f31819fdf774efe7274128f76da\``);
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` DROP FOREIGN KEY \`FK_b8f6e66a3c853da4d5d0c7a28e8\``);
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` DROP FOREIGN KEY \`FK_fcc7e47ef3f168812c8b4bd2ca8\``);
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` DROP FOREIGN KEY \`FK_aceba3ca0c26212002bb5d3a320\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use_measures\` DROP FOREIGN KEY \`FK_c52369dc2cf7cae932e295f968d\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use_measures\` DROP FOREIGN KEY \`FK_099c6d8eacde2afb49823e86e55\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use_measures\` DROP FOREIGN KEY \`FK_b3661483d2b6e269d030f30c65d\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use_measures\` DROP FOREIGN KEY \`FK_3190c4871d0cbfe9bd11128e100\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use_measures\` DROP FOREIGN KEY \`FK_189d78371b1b0b0d2d0d393ac65\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` DROP FOREIGN KEY \`FK_37b617b01784e9360e8f02efab2\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` DROP FOREIGN KEY \`FK_657374b4a70ac935ed7ff070c70\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` DROP FOREIGN KEY \`FK_4d46ef3eec64ae4bbdf0688b7a4\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` DROP FOREIGN KEY \`FK_600e71f264a8c0a91819901c487\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` DROP FOREIGN KEY \`FK_cba91fe82d9f525da1fd73f4dfc\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` DROP FOREIGN KEY \`FK_180f8c6d73e683fc951e0bdefed\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` DROP FOREIGN KEY \`FK_e7bbbc6476884ee2e2a655f3df5\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` DROP FOREIGN KEY \`FK_fa16ac80ee7602638c4ecee9385\``);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` DROP FOREIGN KEY \`FK_307353ca544da837bb520d557cc\``);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` DROP FOREIGN KEY \`FK_cb49024b795846bc709a9fbdeae\``);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` DROP FOREIGN KEY \`FK_e7eef5d06d8f5db94933566427b\``);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` DROP FOREIGN KEY \`FK_bdc6b6d045732d2aaad277965a8\``);
        await queryRunner.query(`DROP INDEX \`REL_aceba3ca0c26212002bb5d3a32\` ON \`results_policy_changes\``);
        await queryRunner.query(`DROP TABLE \`results_policy_changes\``);
        await queryRunner.query(`DROP TABLE \`results_innovations_use_measures\``);
        await queryRunner.query(`DROP TABLE \`units_of_measure\``);
        await queryRunner.query(`DROP INDEX \`REL_600e71f264a8c0a91819901c48\` ON \`results_innovations_use\``);
        await queryRunner.query(`DROP TABLE \`results_innovations_use\``);
        await queryRunner.query(`DROP INDEX \`REL_fa16ac80ee7602638c4ecee938\` ON \`results_innovations_dev\``);
        await queryRunner.query(`DROP TABLE \`results_innovations_dev\``);
        await queryRunner.query(`DROP INDEX \`REL_bdc6b6d045732d2aaad277965a\` ON \`results_capacity_developments\``);
        await queryRunner.query(`DROP TABLE \`results_capacity_developments\``);
        await queryRunner.query(`DROP TABLE \`capdevs_term\``);
    }

}
