import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateFormsInnovDevV21761831794901 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO \`result_questions\` (
                \`question_text\`,
                \`question_description\`,
                \`result_type_id\`,
                \`parent_question_id\`,
                \`question_type_id\`,
                \`question_level\`
            ) VALUES
            ('Yes', NULL, 7, 63, 3, 3),
            ('No actions taken yet', NULL, 7, 63, 3, 3),
            ('Not considered necessary for this innovation', NULL, 7, 63, 3, 3),
            ('It is too early to determine this', NULL, 7, 63, 3, 3),
            ('Yes', NULL, 7, 64, 3, 3),
            ('No actions taken yet', NULL, 7, 64, 3, 3),
            ('Not considered necessary for this innovation', NULL, 7, 64, 3, 3),
            ('It is too early to determine this', NULL, 7, 64, 3, 3),
            ('Yes', NULL, 7, 65, 3, 3),
            ('Not sure', NULL, 7, 65, 3, 3),
            ('No', NULL, 7, 65, 3, 3);
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
         await queryRunner.query(`
            DELETE FROM \`result_questions\`
            WHERE \`result_type_id\` = 7
            AND \`parent_question_id\` IN (63, 64, 65)
            AND \`question_text\` IN (
                'Yes',
                'No actions taken yet',
                'Not considered necessary for this innovation',
                'It is too early to determine this',
                'Not sure',
                'No'
            );
        `);
    }

}
