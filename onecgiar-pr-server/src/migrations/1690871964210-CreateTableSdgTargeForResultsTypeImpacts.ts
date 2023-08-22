import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTableSdgTargeForResultsTypeImpacts1690871964210 implements MigrationInterface {
    name = 'CreateTableSdgTargeForResultsTypeImpacts1690871964210'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_sdg_targets\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_sdg_target_id\` int NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`clarisa_sdg_usnd_code\` bigint NOT NULL, \`clarisa_sdg_target_id\` bigint NOT NULL, PRIMARY KEY (\`result_sdg_target_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_sdg_targets\` ADD CONSTRAINT \`FK_9d4a7f3bd13f3a85da1620e0fe9\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_sdg_targets\` ADD CONSTRAINT \`FK_40ea0cd4e6204fc7753f3a902ba\` FOREIGN KEY (\`clarisa_sdg_usnd_code\`) REFERENCES \`clarisa_sdgs\`(\`usnd_code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_sdg_targets\` ADD CONSTRAINT \`FK_6612828d1f893743634d09f3d69\` FOREIGN KEY (\`clarisa_sdg_target_id\`) REFERENCES \`clarisa_sdgs_targets\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_sdg_targets\` DROP FOREIGN KEY \`FK_6612828d1f893743634d09f3d69\``);
        await queryRunner.query(`ALTER TABLE \`result_sdg_targets\` DROP FOREIGN KEY \`FK_40ea0cd4e6204fc7753f3a902ba\``);
        await queryRunner.query(`ALTER TABLE \`result_sdg_targets\` DROP FOREIGN KEY \`FK_9d4a7f3bd13f3a85da1620e0fe9\``);
        await queryRunner.query(`DROP TABLE \`result_sdg_targets\``);
    }

}
