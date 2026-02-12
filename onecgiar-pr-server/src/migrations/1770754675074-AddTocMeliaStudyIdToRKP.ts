import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTocMeliaStudyIdToRKP1770754675074 implements MigrationInterface {
    name = 'AddTocMeliaStudyIdToRKP1770754675074'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` ADD \`toc_melia_study_id\` varchar(36) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` DROP COLUMN \`toc_melia_study_id\``);
    }

}
