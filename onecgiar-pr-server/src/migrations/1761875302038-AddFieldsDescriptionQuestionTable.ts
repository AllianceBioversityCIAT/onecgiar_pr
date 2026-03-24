import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFieldsDescriptionQuestionTable1761875302038 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE \`result_questions\`
            SET \`question_description\` = 'Consider whether the innovation team has reflected on:​
                <li>The underlying purpose and framing of the innovation​.</li> 
                <li>Key assumptions about who will use or benefit from the innovation​.</li> 
                <li>Alternative perspectives or unintended directions raised by stakeholders.</li>'
            WHERE \`result_question_id\` = 63;
        `);

        await queryRunner.query(`
            UPDATE \`result_questions\`
            SET \`question_description\` = 'Consider whether the innovation is supported by:​
                <li>Appropriate partnerships with local or national institutions.</li> 
                <li>Policies that enable equitable and long-term benefits​.</li> 
                <li>Safeguards to address risks of exclusion or harm​.</li>'
            WHERE \`result_question_id\` = 64;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            UPDATE \`result_questions\`
            SET \`question_description\` = NULL
            WHERE \`result_question_id\` IN (63, 64);
        `);
    }

}
