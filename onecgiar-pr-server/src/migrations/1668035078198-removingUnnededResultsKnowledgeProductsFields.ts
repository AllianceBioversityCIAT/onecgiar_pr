import { MigrationInterface, QueryRunner } from "typeorm";

export class removingUnnededResultsKnowledgeProductsFields1668035078198 implements MigrationInterface {
    name = 'removingUnnededResultsKnowledgeProductsFields1668035078198'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` DROP COLUMN \`issue_date\``);
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` DROP COLUMN \`is_peer_reviewed\``);
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` DROP COLUMN \`is_isi\``);
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` DROP COLUMN \`doi\``);
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` DROP COLUMN \`accesibility\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` ADD \`accesibility\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` ADD \`doi\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` ADD \`is_isi\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` ADD \`is_peer_reviewed\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` ADD \`issue_date\` bigint NULL`);
    }

}
