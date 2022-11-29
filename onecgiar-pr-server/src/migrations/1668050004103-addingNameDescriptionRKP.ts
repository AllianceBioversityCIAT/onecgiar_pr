import { MigrationInterface, QueryRunner } from "typeorm";

export class addingNameDescriptionRKP1668050004103 implements MigrationInterface {
    name = 'addingNameDescriptionRKP1668050004103'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` ADD \`name\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` ADD \`description\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` DROP COLUMN \`description\``);
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` DROP COLUMN \`name\``);
    }

}
