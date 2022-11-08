import { MigrationInterface, QueryRunner } from "typeorm";

export class centers1667851525346 implements MigrationInterface {
    name = 'centers1667851525346'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`clarisa_center\` (\`id\` int NOT NULL AUTO_INCREMENT, \`financial_code\` text NULL, \`institution_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`non_pooled_project\` (\`id\` int NOT NULL AUTO_INCREMENT, \`grant_title\` text NULL, \`center_grant_id\` text NULL, \`is_active\` tinyint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`results_id\` bigint NULL, \`lead_center_id\` int NULL, \`funder_institution_id\` int NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`results_center\` (\`id\` int NOT NULL AUTO_INCREMENT, \`is_primary\` tinyint NOT NULL, \`is_active\` tinyint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`center_id\` int NULL, \`result_id\` bigint NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`clarisa_center\` ADD CONSTRAINT \`FK_6855ddf4626ebb98629bcbf62f2\` FOREIGN KEY (\`institution_id\`) REFERENCES \`clarisa_institutions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` ADD CONSTRAINT \`FK_e13cecd306ce3faddf860a30f7b\` FOREIGN KEY (\`results_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` ADD CONSTRAINT \`FK_da85bf6616483df2f76bbc85d6b\` FOREIGN KEY (\`lead_center_id\`) REFERENCES \`clarisa_institutions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` ADD CONSTRAINT \`FK_45bfc61b1614258a4c8a45b30a9\` FOREIGN KEY (\`funder_institution_id\`) REFERENCES \`clarisa_institutions\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` ADD CONSTRAINT \`FK_c2182130ff54ca845f56bede8f2\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` ADD CONSTRAINT \`FK_689004d628fad720f631f4ed116\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_center\` ADD CONSTRAINT \`FK_8226c8a3367035d7ec411d6dd54\` FOREIGN KEY (\`center_id\`) REFERENCES \`clarisa_center\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_center\` ADD CONSTRAINT \`FK_7c98ef36a8112272aded531462d\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_center\` ADD CONSTRAINT \`FK_cc9fc422853fe8ef40acd8b7555\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_center\` ADD CONSTRAINT \`FK_977252e385e1f6c9fde703a2f0f\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_center\` DROP FOREIGN KEY \`FK_977252e385e1f6c9fde703a2f0f\``);
        await queryRunner.query(`ALTER TABLE \`results_center\` DROP FOREIGN KEY \`FK_cc9fc422853fe8ef40acd8b7555\``);
        await queryRunner.query(`ALTER TABLE \`results_center\` DROP FOREIGN KEY \`FK_7c98ef36a8112272aded531462d\``);
        await queryRunner.query(`ALTER TABLE \`results_center\` DROP FOREIGN KEY \`FK_8226c8a3367035d7ec411d6dd54\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` DROP FOREIGN KEY \`FK_689004d628fad720f631f4ed116\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` DROP FOREIGN KEY \`FK_c2182130ff54ca845f56bede8f2\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` DROP FOREIGN KEY \`FK_45bfc61b1614258a4c8a45b30a9\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` DROP FOREIGN KEY \`FK_da85bf6616483df2f76bbc85d6b\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_project\` DROP FOREIGN KEY \`FK_e13cecd306ce3faddf860a30f7b\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_center\` DROP FOREIGN KEY \`FK_6855ddf4626ebb98629bcbf62f2\``);
        await queryRunner.query(`DROP TABLE \`results_center\``);
        await queryRunner.query(`DROP TABLE \`non_pooled_project\``);
        await queryRunner.query(`DROP TABLE \`clarisa_center\``);
    }

}
