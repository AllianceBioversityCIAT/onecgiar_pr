import { MigrationInterface, QueryRunner } from "typeorm";

export class createNewTableSaveIndicatorContributin1690299393394 implements MigrationInterface {
    name = 'createNewTableSaveIndicatorContributin1690299393394'

    public async up(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`CREATE TABLE \`results_toc_result_indicators\` (\`result_toc_result_indicator_id\` bigint NOT NULL AUTO_INCREMENT, \`toc_results_indicator_id\` text NOT NULL, \`results_toc_results_id\` bigint NOT NULL, \`status\` bigint NULL, \`indicator_contributing\` text  NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`result_toc_result_indicator_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`results_toc_result_indicators\` ADD CONSTRAINT \`FK_9f2390943480c54bff0c0a3b7e1\` FOREIGN KEY (\`results_toc_results_id\`) REFERENCES \`results_toc_result\`(\`result_toc_result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_toc_result_indicators\` ADD CONSTRAINT \`FK_8b636a1c9bf058ffaefbc4e39ab\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_toc_result_indicators\` ADD CONSTRAINT \`FK_bcfd146981b07b4c5504f576ae1\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_toc_result_indicators\` DROP FOREIGN KEY \`FK_bcfd146981b07b4c5504f576ae1\``);
        await queryRunner.query(`ALTER TABLE \`results_toc_result_indicators\` DROP FOREIGN KEY \`FK_8b636a1c9bf058ffaefbc4e39ab\``);
        await queryRunner.query(`ALTER TABLE \`results_toc_result_indicators\` DROP FOREIGN KEY \`FK_9f2390943480c54bff0c0a3b7e1\``);
        await queryRunner.query(`DROP TABLE \`results_toc_result_indicators\``);
    }

}
