import { MigrationInterface, QueryRunner } from "typeorm";

export class Version2InnovationDevelop1761805805185 implements MigrationInterface {
    name = 'Version2InnovationDevelop1761805805185'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` ADD \`has_scaling_studies\` tinyint NULL`);
        await queryRunner.query(`
            INSERT INTO \`result_questions\` (
                \`question_text\`,
                \`question_description\`,
                \`result_type_id\`,
                \`parent_question_id\`,
                \`question_type_id\`,
                \`question_level\`
            ) VALUES
            (
                'Have the assumptions and intended purposes of this innovation been critically examined with stakeholders?',
                NULL,
                7,
                1,
                2,
                2
            ),
            (
                'Are the right partners, policies, and safeguards in place to ensure the benefits of the innovation are sustained and equitably shared?',
                NULL,
                7,
                1,
                2,
                2
            ),
            (
                'Is the private sector already involved/co-investing in research/innovation development/scaling (in kind, or in cash)?',
                NULL,
                7,
                26,
                2,
                2
            );
        `);

        await queryRunner.query(`
            UPDATE \`result_questions\`
            SET \`question_text\` = 'Would you like to receive support from an Intellectual Property expert?'
            WHERE \`result_question_id\` = 29;
        `);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` DROP COLUMN \`has_scaling_studies\``);

        await queryRunner.query(`
            UPDATE \`result_questions\`
            SET \`question_text\` = 'PREVIOUS_TEXT_HERE'
            WHERE \`result_question_id\` = 29;
        `);
    }

}
