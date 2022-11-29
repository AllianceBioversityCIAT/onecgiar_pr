import { MigrationInterface, QueryRunner } from "typeorm";

export class addColumnDoiRKP1668446869700 implements MigrationInterface {
    name = 'addColumnDoiRKP1668446869700'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` ADD \`doi\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` DROP COLUMN \`doi\``);
    }

}
