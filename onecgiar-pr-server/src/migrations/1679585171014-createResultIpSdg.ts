import { MigrationInterface, QueryRunner } from "typeorm";

export class createResultIpSdg1679585171014 implements MigrationInterface {
    name = 'createResultIpSdg1679585171014'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_ip_sdg_targets\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`version_id\` bigint NOT NULL, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_ip_sdg_target_id\` int NOT NULL AUTO_INCREMENT, \`result_by_innovation_package_id\` bigint NOT NULL, \`clarisa_sdg_usnd_code\` bigint NOT NULL, \`clarisa_sdg_target_id\` bigint NOT NULL, PRIMARY KEY (\`result_ip_sdg_target_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_ip_sdg_targets\` ADD CONSTRAINT \`FK_92ac2a198bf0d5d70e03ac69d57\` FOREIGN KEY (\`result_by_innovation_package_id\`) REFERENCES \`result_by_innovation_package\`(\`result_by_innovation_package_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_sdg_targets\` ADD CONSTRAINT \`FK_824b79a9c20aa49a7ce4e43b0e8\` FOREIGN KEY (\`clarisa_sdg_usnd_code\`) REFERENCES \`clarisa_sdgs\`(\`usnd_code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_ip_sdg_targets\` ADD CONSTRAINT \`FK_06dd78d6c50b9e3a563ddb8b2d1\` FOREIGN KEY (\`clarisa_sdg_target_id\`) REFERENCES \`clarisa_sdgs_targets\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_sdg_targets\` DROP FOREIGN KEY \`FK_06dd78d6c50b9e3a563ddb8b2d1\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_sdg_targets\` DROP FOREIGN KEY \`FK_824b79a9c20aa49a7ce4e43b0e8\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_sdg_targets\` DROP FOREIGN KEY \`FK_92ac2a198bf0d5d70e03ac69d57\``);
        await queryRunner.query(`DROP TABLE \`result_ip_sdg_targets\``);
    }

}
