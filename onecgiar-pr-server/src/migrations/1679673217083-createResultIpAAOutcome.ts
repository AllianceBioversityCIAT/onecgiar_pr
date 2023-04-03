import { MigrationInterface, QueryRunner } from "typeorm";

export class createResultIpAAOutcome1679673217083 implements MigrationInterface {
    name = 'createResultIpAAOutcome1679673217083'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_ip_action_area_outcome\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_ip_action_area_outcome_id\` int NOT NULL AUTO_INCREMENT, \`result_by_innovation_package_id\` bigint NOT NULL, \`action_area_outcome_id\` int NOT NULL, PRIMARY KEY (\`result_ip_action_area_outcome_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_ip_action_area_outcome\` ADD CONSTRAINT \`FK_eeecd427547eec942aa801fc3d4\` FOREIGN KEY (\`result_by_innovation_package_id\`) REFERENCES \`result_by_innovation_package\`(\`result_by_innovation_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_action_area_outcome\` ADD CONSTRAINT \`FK_c27472474409208d67eee87c1fe\` FOREIGN KEY (\`action_area_outcome_id\`) REFERENCES \`clarisa_action_area_outcome\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_action_area_outcome\` ADD CONSTRAINT \`FK_60fbcf902b48f673576a60a6251\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_action_area_outcome\` DROP FOREIGN KEY \`FK_60fbcf902b48f673576a60a6251\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_action_area_outcome\` DROP FOREIGN KEY \`FK_c27472474409208d67eee87c1fe\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_action_area_outcome\` DROP FOREIGN KEY \`FK_eeecd427547eec942aa801fc3d4\``);
        await queryRunner.query(`DROP TABLE \`result_ip_action_area_outcome\``);
    }

}
