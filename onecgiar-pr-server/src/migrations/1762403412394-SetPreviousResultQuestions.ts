import { MigrationInterface, QueryRunner } from "typeorm";

export class SetPreviousResultQuestions1762403412394 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE result_questions
            SET previous_question_id = 2
            WHERE result_question_id = 78;
        `);

        await queryRunner.query(`
            UPDATE result_questions
            SET previous_question_id = 3
            WHERE result_question_id = 79;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE result_questions
            SET previous_question_id = NULL
            WHERE result_question_id IN (78, 79);
        `);
    }

}
