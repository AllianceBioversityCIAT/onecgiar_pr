import { MigrationInterface, QueryRunner } from "typeorm";

export class createResultIPMeasures1679586657415 implements MigrationInterface {
    name = 'createResultIPMeasures1679586657415'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_ip_measure\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_ip_measure_id\` bigint NOT NULL AUTO_INCREMENT, \`unit_of_measure\` text NULL, \`quantity\` bigint NULL, \`result_ip_id\` bigint NOT NULL, PRIMARY KEY (\`result_ip_measure_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_ip_measure\` ADD CONSTRAINT \`FK_94cc9c71903dcdcbdc74f4c7856\` FOREIGN KEY (\`result_ip_id\`) REFERENCES \`result_innovation_package\`(\`result_innovation_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_measure\` ADD CONSTRAINT \`FK_7dd28026f8b335844eeb77800e4\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_measure\` DROP FOREIGN KEY \`FK_7dd28026f8b335844eeb77800e4\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_measure\` DROP FOREIGN KEY \`FK_94cc9c71903dcdcbdc74f4c7856\``);
        await queryRunner.query(`DROP TABLE \`result_ip_measure\``);
    }

}
