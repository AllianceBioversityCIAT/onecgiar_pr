import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTableImpactAreaTocSdgTargetToc1690487857601 implements MigrationInterface {
    name = 'CreateTableImpactAreaTocSdgTargetToc1690487857601'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_toc_impact_area_target\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_toc_impact_area_id\` int NOT NULL AUTO_INCREMENT, \`result_by_innovation_package_id\` bigint NOT NULL, \`impact_area_indicator_id\` int NOT NULL, \`results_toc_results_id\` bigint NULL, PRIMARY KEY (\`result_toc_impact_area_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`result_toc_sdg_targets\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_toc_sdg_target_id\` int NOT NULL AUTO_INCREMENT, \`result_by_innovation_package_id\` bigint NOT NULL, \`clarisa_sdg_usnd_code\` bigint NOT NULL, \`clarisa_sdg_target_id\` bigint NOT NULL, \`results_toc_results_id\` bigint NULL, PRIMARY KEY (\`result_toc_sdg_target_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_toc_impact_area_target\` ADD CONSTRAINT \`FK_54afb7783a3771a327bf3209b69\` FOREIGN KEY (\`results_toc_results_id\`) REFERENCES \`results_toc_result\`(\`result_toc_result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_toc_impact_area_target\` ADD CONSTRAINT \`FK_4208ab88d6efd147b81b30aa218\` FOREIGN KEY (\`impact_area_indicator_id\`) REFERENCES \`clarisa_global_targets\`(\`targetId\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_toc_sdg_targets\` ADD CONSTRAINT \`FK_bc6daa8edc25e82cfb54bb5a72b\` FOREIGN KEY (\`results_toc_results_id\`) REFERENCES \`results_toc_result\`(\`result_toc_result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_toc_sdg_targets\` ADD CONSTRAINT \`FK_198410ac5e0557a02227cf80ec4\` FOREIGN KEY (\`clarisa_sdg_usnd_code\`) REFERENCES \`clarisa_sdgs\`(\`usnd_code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_toc_sdg_targets\` ADD CONSTRAINT \`FK_51d33b76490facd0a9fed056f4f\` FOREIGN KEY (\`clarisa_sdg_target_id\`) REFERENCES \`clarisa_sdgs_targets\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_toc_sdg_targets\` DROP FOREIGN KEY \`FK_51d33b76490facd0a9fed056f4f\``);
        await queryRunner.query(`ALTER TABLE \`result_toc_sdg_targets\` DROP FOREIGN KEY \`FK_198410ac5e0557a02227cf80ec4\``);
        await queryRunner.query(`ALTER TABLE \`result_toc_sdg_targets\` DROP FOREIGN KEY \`FK_bc6daa8edc25e82cfb54bb5a72b\``);
        await queryRunner.query(`ALTER TABLE \`result_toc_impact_area_target\` DROP FOREIGN KEY \`FK_4208ab88d6efd147b81b30aa218\``);
        await queryRunner.query(`ALTER TABLE \`result_toc_impact_area_target\` DROP FOREIGN KEY \`FK_54afb7783a3771a327bf3209b69\``);
        await queryRunner.query(`DROP TABLE \`result_toc_sdg_targets\``);
        await queryRunner.query(`DROP TABLE \`result_toc_impact_area_target\``);
    }

}
