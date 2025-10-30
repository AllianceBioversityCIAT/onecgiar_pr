import { MigrationInterface, QueryRunner } from "typeorm";

export class TargetInnovUse20301761617163195 implements MigrationInterface {
    name = 'TargetInnovUse20301761617163195'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_innov_section\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`name\` varchar(100) NOT NULL, \`description\` text NULL, \`created_date\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, \`last_updated_date\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, \`is_active\` tinyint NOT NULL DEFAULT 1, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_actors\` ADD \`section_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` ADD \`section_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_ip_measure\` ADD \`section_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_actors\` ADD CONSTRAINT \`FK_6ee1465dc1c2daad3c6d7ff03c3\` FOREIGN KEY (\`section_id\`) REFERENCES \`result_innov_section\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` ADD CONSTRAINT \`FK_7ecf3800a3ec387a5175f30966a\` FOREIGN KEY (\`section_id\`) REFERENCES \`result_innov_section\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_measure\` ADD CONSTRAINT \`FK_64ba2aa9e4f3a4ef05a23dc704c\` FOREIGN KEY (\`section_id\`) REFERENCES \`result_innov_section\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`
            INSERT INTO \`result_innov_section\` (\`name\`, \`description\`, \`is_active\`, \`created_date\`, \`last_updated_date\`)
            VALUES 
                ('Current', 'Current Innovation Use evidence', 1, NOW(), NOW()),
                ('Future', 'Targeted innovation use by the end of 2030', 1, NOW(), NOW());
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` DROP FOREIGN KEY \`FK_7ecf3800a3ec387a5175f30966a\``);
        await queryRunner.query(`DROP TABLE \`result_innov_section\``);
        await queryRunner.query(`ALTER TABLE \`result_actors\` DROP FOREIGN KEY \`FK_6ee1465dc1c2daad3c6d7ff03c3\``);
        await queryRunner.query(`ALTER TABLE \`result_actors\` DROP COLUMN \`section_id\``);
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`section_id\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_measure\` DROP FOREIGN KEY \`FK_64ba2aa9e4f3a4ef05a23dc704c\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_measure\` DROP COLUMN \`section_id\``);
        await queryRunner.query(`
            DELETE FROM \`result_innov_section\`
            WHERE \`name\` IN ('Current', 'Future');
        `);
    }

}
