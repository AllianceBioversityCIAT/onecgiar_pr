import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeSomeRowsQuestionsP251762401252487 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM result_questions
            WHERE result_question_id IN (82, 83, 123, 124);
        `);

        await queryRunner.query(`
            DELETE FROM result_questions
            WHERE result_question_id = 122;
        `);

        // ✏️ Actualizar textos y descripciones
        await queryRunner.query(`
            UPDATE result_questions
            SET question_text = 'Which concrete actions have been taken to understand and improve Gender Equality and Social Inclusivity (GESI) in developing this innovation?'
            WHERE result_question_id = 78;
        `);

        await queryRunner.query(`
            UPDATE result_questions
            SET 
                question_text = 'What concrete actions have been taken to understand and/or limit potential unintended negative consequences or impacts if the innovation is used at scale?',
                question_description = 'Think about how innovation use at scale may lead to:<li>Increased greenhouse gas emissions;</li><li>Losses in (agro-)biodiversity;</li><li>Gender inequality and/or social exclusion;</li><li>Compromised human health, nutrition and/or food security;</li><li>Increase income gaps or (youth) unemployment.</li><li>Gender-based violence.</li>'
            WHERE result_question_id = 79;
        `);

        await queryRunner.query(`
            UPDATE result_questions
            SET question_text = 'How have the end users/stakeholders been involved in defining assumptions and purposes of the innovations to ensure legitimacy and institutional fit?'
            WHERE result_question_id = 136;
        `);

        await queryRunner.query(`
            UPDATE result_questions
            SET 
                question_text = 'What partners, policies, and financial mechanisms are in place to ensure the benefits of the innovation are sustained and equitably shared?',
                question_description = 'Consider whether the innovation team has reflected on:​<li>Appropriate partnerships with local or national institutions.</li><li>Policies that enable equitable and long-term benefits​.</li><li>Financial models considered for sustainability beyond project/program.</li>'
            WHERE result_question_id = 137;
        `);

        await queryRunner.query(`
            UPDATE result_questions
            SET question_text = 'Yes, the following actions have been taken:'
            WHERE result_question_id = 139;
        `);

        await queryRunner.query(`
            UPDATE result_questions
            SET question_text = 'Yes, the following actions have been taken:'
            WHERE result_question_id = 143;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
