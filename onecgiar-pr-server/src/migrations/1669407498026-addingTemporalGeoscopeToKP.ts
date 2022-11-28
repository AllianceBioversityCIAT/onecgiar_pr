import { MigrationInterface, QueryRunner } from "typeorm";

export class addingTemporalGeoscopeToKP1669407498026 implements MigrationInterface {
    name = 'addingTemporalGeoscopeToKP1669407498026'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` ADD \`cgspace_regions\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` ADD \`cgspace_countries\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` DROP COLUMN \`cgspace_countries\``);
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` DROP COLUMN \`cgspace_regions\``);
    }

}
