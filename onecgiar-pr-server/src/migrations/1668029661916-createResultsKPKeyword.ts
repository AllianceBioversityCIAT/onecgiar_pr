import { MigrationInterface, QueryRunner } from "typeorm";

export class createResultsKPKeyword1668029661916 implements MigrationInterface {
    name = 'createResultsKPKeyword1668029661916'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`results_kp_keywords\` (\`result_kp_metadata_id\` bigint NOT NULL AUTO_INCREMENT, \`keyword\` text NULL, \`is_agrovoc\` tinyint NULL, \`is_active\` tinyint NOT NULL DEFAULT 1, \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`result_knowledge_product_id\` bigint NULL, \`version_id\` bigint NOT NULL, \`created_by\` int NOT NULL, \`last_updated_by\` int NULL, PRIMARY KEY (\`result_kp_metadata_id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`results_kp_keywords\` ADD CONSTRAINT \`FK_a8ede7fff5ef7f03fc19466e432\` FOREIGN KEY (\`result_knowledge_product_id\`) REFERENCES \`results_knowledge_product\`(\`result_knowledge_product_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_kp_keywords\` ADD CONSTRAINT \`FK_5e6fe1c7d103c1dac94d3142f6a\` FOREIGN KEY (\`version_id\`) REFERENCES \`version\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_kp_keywords\` ADD CONSTRAINT \`FK_7323a6e126fe7b4cc4bf2164660\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`results_kp_keywords\` ADD CONSTRAINT \`FK_3da70494dc4ce16a14430a083f5\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_kp_keywords\` DROP FOREIGN KEY \`FK_3da70494dc4ce16a14430a083f5\``);
        await queryRunner.query(`ALTER TABLE \`results_kp_keywords\` DROP FOREIGN KEY \`FK_7323a6e126fe7b4cc4bf2164660\``);
        await queryRunner.query(`ALTER TABLE \`results_kp_keywords\` DROP FOREIGN KEY \`FK_5e6fe1c7d103c1dac94d3142f6a\``);
        await queryRunner.query(`ALTER TABLE \`results_kp_keywords\` DROP FOREIGN KEY \`FK_a8ede7fff5ef7f03fc19466e432\``);
        await queryRunner.query(`DROP TABLE \`results_kp_keywords\``);
    }

}
