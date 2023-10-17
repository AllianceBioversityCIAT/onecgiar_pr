import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQuestionInNewTableTargets1694115748077 implements MigrationInterface {
    name = 'AddQuestionInNewTableTargets1694115748077'

    public async up(queryRunner: QueryRunner): Promise<void> {
        
        await queryRunner.query(`ALTER TABLE \`result_indicators_targets\` ADD \`indicator_question\` tinyint NULL`);
        
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
       
        await queryRunner.query(`ALTER TABLE \`result_indicators_targets\` DROP COLUMN \`indicator_question\``);
       
    }

}
