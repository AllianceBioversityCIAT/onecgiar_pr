import { MigrationInterface, QueryRunner } from "typeorm";

export class addingNotNullConstraintResultKP1668459085996 implements MigrationInterface {
    name = 'addingNotNullConstraintResultKP1668459085996'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` DROP FOREIGN KEY \`FK_cec37dd9524730ed14f4f7ee325\``);
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` CHANGE \`results_id\` \`results_id\` bigint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` ADD CONSTRAINT \`FK_cec37dd9524730ed14f4f7ee325\` FOREIGN KEY (\`results_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` DROP FOREIGN KEY \`FK_cec37dd9524730ed14f4f7ee325\``);
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` CHANGE \`results_id\` \`results_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` ADD CONSTRAINT \`FK_cec37dd9524730ed14f4f7ee325\` FOREIGN KEY (\`results_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
