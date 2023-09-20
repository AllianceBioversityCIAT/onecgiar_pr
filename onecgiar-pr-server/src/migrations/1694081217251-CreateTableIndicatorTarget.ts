import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTableIndicatorTarget1694081217251 implements MigrationInterface {
    name = 'CreateTableIndicatorTarget1694081217251'

    public async up(queryRunner: QueryRunner): Promise<void> {
       await queryRunner.query(`CREATE TABLE \`result_indicators_targets\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`indicators_targets\` int NOT NULL AUTO_INCREMENT, \`number_target\` bigint NOT NULL, \`result_toc_result_indicator_id\` bigint NOT NULL, \`contributing_indicator\` text NOT NULL, PRIMARY KEY (\`indicators_targets\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_indicators_targets\` ADD CONSTRAINT \`FK_6a5a4257269162f01a954ecd1ff\` FOREIGN KEY (\`result_toc_result_indicator_id\`) REFERENCES \`results_toc_result_indicators\`(\`result_toc_result_indicator_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_indicators_targets\` DROP FOREIGN KEY \`FK_6a5a4257269162f01a954ecd1ff\``);
        await queryRunner.query(`DROP TABLE \`result_indicators_targets\``);
        }

}
