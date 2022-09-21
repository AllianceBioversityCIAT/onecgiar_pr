import { MigrationInterface, QueryRunner } from "typeorm";

export class resultsdatamodel1663773959336 implements MigrationInterface {
    name = 'resultsdatamodel1663773959336'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`gender_tag_level\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`title\` varchar(45) NOT NULL, \`description\` varchar(500) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`result_level\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(45) NOT NULL, \`description\` varchar(500) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`result_type\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(100) NOT NULL, \`description\` varchar(500) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`first_name\` varchar(200) NOT NULL, \`last_name\` varchar(200) NOT NULL, \`email\` varchar(500) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`version\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`version_name\` varchar(45) NOT NULL, \`start_date\` varchar(45) NOT NULL, \`end_date\` varchar(45) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`result\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`title\` varchar(45) NOT NULL, \`description\` text NOT NULL, \`is_active\` tinyint NOT NULL, \`created_date\` timestamp NOT NULL, \`last_updated_date\` timestamp NOT NULL, \`result_level_id\` bigint NULL, \`result_type_id\` bigint NULL, \`gender_tag_level_id\` bigint NULL, \`version_id\` bigint NOT NULL, \`created_by\` bigint NOT NULL, \`last_updated_by\` bigint NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`inititiative\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`official_code\` varchar(45) NOT NULL, \`name\` varchar(500) NOT NULL, \`short_name\` varchar(100) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`institution_role\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(50) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`results_by_inititiative\` (\`result_id\` bigint NOT NULL, \`inititiative_id\` bigint NOT NULL, \`role\` bigint NOT NULL, \`is_active\` tinyint NOT NULL, \`created_date\` timestamp NOT NULL, \`last_updated_date\` timestamp NOT NULL, \`resultIdId\` bigint NULL, \`inititiativeIdId\` bigint NULL, \`version_id\` bigint NOT NULL, \`created_by\` bigint NOT NULL, \`last_updated_by\` bigint NULL, PRIMARY KEY (\`result_id\`, \`inititiative_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`results_by_institution_type\` (\`results_id\` bigint NOT NULL AUTO_INCREMENT, \`is_active\` tinyint NOT NULL, \`creation_date\` timestamp NOT NULL, \`last_updated_date\` timestamp NOT NULL, \`institution_roles_id\` bigint NOT NULL, \`version_id\` bigint NOT NULL, \`created_by\` bigint NOT NULL, \`last_updated_by\` bigint NULL, PRIMARY KEY (\`results_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`results_by_institution\` (\`results_id\` bigint NOT NULL AUTO_INCREMENT, \`institutions_id\` int NOT NULL, \`institution_roles_id\` bigint NOT NULL, \`is_active\` tinyint NOT NULL, \`created_date\` timestamp NOT NULL, \`last_updated_date\` timestamp NOT NULL, \`version_id\` bigint NOT NULL, \`created_by\` bigint NOT NULL, \`last_updated_by\` bigint NULL, PRIMARY KEY (\`results_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD CONSTRAINT \`FK_cdbae393c1c7603a7c19c574cb1\` FOREIGN KEY (\`result_level_id\`) REFERENCES \`result_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD CONSTRAINT \`FK_87067d6e5348ba4b09bd3c4cb64\` FOREIGN KEY (\`result_type_id\`) REFERENCES \`result_type\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD CONSTRAINT \`FK_99e440b135663e707b3f8386212\` FOREIGN KEY (\`gender_tag_level_id\`) REFERENCES \`gender_tag_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD CONSTRAINT \`FK_dd923902fe9bd17c971a4bd987e\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD CONSTRAINT \`FK_fea91e52131de09b1c76ce144af\` FOREIGN KEY (\`created_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD CONSTRAINT \`FK_c62881778cd9bcf0c78f954c300\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` ADD CONSTRAINT \`FK_a0c6f82ad47568f33cd124a3fab\` FOREIGN KEY (\`resultIdId\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` ADD CONSTRAINT \`FK_ba7a756928195866e7e845e9698\` FOREIGN KEY (\`inititiativeIdId\`) REFERENCES \`inititiative\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` ADD CONSTRAINT \`FK_64714f53816392407e30ec0aa6f\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` ADD CONSTRAINT \`FK_a4bb5660ef58c4236560192df90\` FOREIGN KEY (\`created_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` ADD CONSTRAINT \`FK_fb24d9cfa00e2e2ead619a61dd0\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` ADD CONSTRAINT \`FK_1f9eeeee19cfa4711445d4885d1\` FOREIGN KEY (\`institution_roles_id\`) REFERENCES \`institution_role\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` ADD CONSTRAINT \`FK_55bca184237100f0ef8cc8fb0ea\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` ADD CONSTRAINT \`FK_5feeeaa251795ec834bc6d8a72d\` FOREIGN KEY (\`created_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` ADD CONSTRAINT \`FK_5ecc67bc0d3fdc650138d509d27\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` ADD CONSTRAINT \`FK_030b9938e0e50a182205ba0d322\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` ADD CONSTRAINT \`FK_73cf3e6ca5a84f6fb065860b4dd\` FOREIGN KEY (\`created_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` ADD CONSTRAINT \`FK_141eb58a1a014a850a97ce518ef\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` DROP FOREIGN KEY \`FK_141eb58a1a014a850a97ce518ef\``);
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` DROP FOREIGN KEY \`FK_73cf3e6ca5a84f6fb065860b4dd\``);
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` DROP FOREIGN KEY \`FK_030b9938e0e50a182205ba0d322\``);
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` DROP FOREIGN KEY \`FK_5ecc67bc0d3fdc650138d509d27\``);
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` DROP FOREIGN KEY \`FK_5feeeaa251795ec834bc6d8a72d\``);
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` DROP FOREIGN KEY \`FK_55bca184237100f0ef8cc8fb0ea\``);
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` DROP FOREIGN KEY \`FK_1f9eeeee19cfa4711445d4885d1\``);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` DROP FOREIGN KEY \`FK_fb24d9cfa00e2e2ead619a61dd0\``);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` DROP FOREIGN KEY \`FK_a4bb5660ef58c4236560192df90\``);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` DROP FOREIGN KEY \`FK_64714f53816392407e30ec0aa6f\``);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` DROP FOREIGN KEY \`FK_ba7a756928195866e7e845e9698\``);
        await queryRunner.query(`ALTER TABLE \`results_by_inititiative\` DROP FOREIGN KEY \`FK_a0c6f82ad47568f33cd124a3fab\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_c62881778cd9bcf0c78f954c300\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_fea91e52131de09b1c76ce144af\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_dd923902fe9bd17c971a4bd987e\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_99e440b135663e707b3f8386212\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_87067d6e5348ba4b09bd3c4cb64\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP FOREIGN KEY \`FK_cdbae393c1c7603a7c19c574cb1\``);
        await queryRunner.query(`DROP TABLE \`results_by_institution\``);
        await queryRunner.query(`DROP TABLE \`results_by_institution_type\``);
        await queryRunner.query(`DROP TABLE \`results_by_inititiative\``);
        await queryRunner.query(`DROP TABLE \`institution_role\``);
        await queryRunner.query(`DROP TABLE \`inititiative\``);
        await queryRunner.query(`DROP TABLE \`result\``);
        await queryRunner.query(`DROP TABLE \`version\``);
        await queryRunner.query(`DROP TABLE \`user\``);
        await queryRunner.query(`DROP TABLE \`result_type\``);
        await queryRunner.query(`DROP TABLE \`result_level\``);
        await queryRunner.query(`DROP TABLE \`gender_tag_level\``);
    }

}
