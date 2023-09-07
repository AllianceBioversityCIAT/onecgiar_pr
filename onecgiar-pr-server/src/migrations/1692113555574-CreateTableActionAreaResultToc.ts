import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTableActionAreaResultToc1692113555574 implements MigrationInterface {
    name = 'CreateTableActionAreaResultToc1692113555574'

    public async up(queryRunner: QueryRunner): Promise<void> {
        
        await queryRunner.query(`CREATE TABLE \`result_toc_action_area\` (\`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`created_by\` bigint NULL, \`last_updated_by\` bigint NULL, \`result_toc_action_area\` int NOT NULL AUTO_INCREMENT, \`result_toc_result_id\` bigint NOT NULL, \`action_area_outcome\` bigint NOT NULL, PRIMARY KEY (\`result_toc_action_area\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_toc_action_area\` ADD CONSTRAINT \`FK_1fe2104121e7c5dce669d571985\` FOREIGN KEY (\`result_toc_result_id\`) REFERENCES \`results_toc_result\`(\`result_toc_result_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_toc_action_area\` DROP FOREIGN KEY \`FK_1fe2104121e7c5dce669d571985\``);
        await queryRunner.query(`DROP TABLE \`result_toc_action_area\``);
    }

}
