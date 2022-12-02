import { MigrationInterface, QueryRunner } from "typeorm";

export class addOSTMeliaStudyKP1670012343284 implements MigrationInterface {
    name = 'addOSTMeliaStudyKP1670012343284'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` ADD \`ost_melia_study_id\` bigint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_knowledge_product\` DROP COLUMN \`ost_melia_study_id\``);
    }

}
