import { MigrationInterface, QueryRunner } from "typeorm";

export class createResultIpEoiOutcome1679515111296 implements MigrationInterface {
    name = 'createResultIpEoiOutcome1679515111296'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_ip_eoi_outcomes\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_ip_eoi_outcome_id\` int NOT NULL AUTO_INCREMENT, \`result_by_innovation_package_id\` bigint NOT NULL, \`toc_result_id\` int NOT NULL, PRIMARY KEY (\`result_ip_eoi_outcome_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_ip_eoi_outcomes\` ADD CONSTRAINT \`FK_08888d9ee8d99fafb0d47af4949\` FOREIGN KEY (\`result_by_innovation_package_id\`) REFERENCES \`result_by_innovation_package\`(\`result_by_innovation_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_eoi_outcomes\` ADD CONSTRAINT \`FK_526f3ea7b85362c4903ab598de5\` FOREIGN KEY (\`toc_result_id\`) REFERENCES \`toc_result\`(\`toc_result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_eoi_outcomes\` ADD CONSTRAINT \`FK_2f8501c89baaddae679140d3a2c\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_eoi_outcomes\` DROP FOREIGN KEY \`FK_2f8501c89baaddae679140d3a2c\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_eoi_outcomes\` DROP FOREIGN KEY \`FK_526f3ea7b85362c4903ab598de5\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_eoi_outcomes\` DROP FOREIGN KEY \`FK_08888d9ee8d99fafb0d47af4949\``);
        await queryRunner.query(`DROP TABLE \`result_ip_eoi_outcomes\``);
    }

}
