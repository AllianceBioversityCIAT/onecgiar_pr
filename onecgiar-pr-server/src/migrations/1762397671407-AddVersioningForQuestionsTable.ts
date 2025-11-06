import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVersioningForQuestionsTable1762397671407 implements MigrationInterface {
    name = 'AddVersioningForQuestionsTable1762397671407'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_questions\` ADD \`version\` enum ('P22', 'P25') NULL`);
        await queryRunner.query(`ALTER TABLE \`result_questions\` ADD \`previous_question_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_questions\` ADD CONSTRAINT \`FK_9aefcb26774a8b07f7f4972e0ce\` FOREIGN KEY (\`previous_question_id\`) REFERENCES \`result_questions\`(\`result_question_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_questions\` DROP FOREIGN KEY \`FK_9aefcb26774a8b07f7f4972e0ce\``);
        await queryRunner.query(`ALTER TABLE \`result_questions\` DROP COLUMN \`previous_question_id\``);
        await queryRunner.query(`ALTER TABLE \`result_questions\` DROP COLUMN \`version\``);
    }

}
