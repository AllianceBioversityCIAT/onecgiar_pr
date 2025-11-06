import { MigrationInterface, QueryRunner } from "typeorm";

export class PopulateDataResultQuestions1762398554711 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const oldRecords = await queryRunner.query(`
            SELECT result_question_id, question_text, question_description, result_type_id,
                    parent_question_id, question_type_id, question_level, previous_question_id
            FROM result_questions
            ORDER BY result_question_id;
        `);

        const idMap = new Map<number, number>();

        for (const record of oldRecords) {
            const result = await queryRunner.query(
                `
                INSERT INTO result_questions
                (question_text, question_description, result_type_id,
                parent_question_id, question_type_id, question_level,
                version, previous_question_id)
                VALUES (?, ?, ?, NULL, ?, ?, 'P25', ?);
                `,
                [
                record.question_text,
                record.question_description,
                record.result_type_id,
                record.question_type_id,
                record.question_level,
                record.previous_question_id,
                ],
            );

            const newId = result.insertId;
            idMap.set(record.result_question_id, newId);
        }

        for (const record of oldRecords) {
            const newId = idMap.get(record.result_question_id);
            const newParentId = record.parent_question_id
                ? idMap.get(record.parent_question_id)
                : null;

            if (newParentId) {
                await queryRunner.query(
                `
                UPDATE result_questions
                SET parent_question_id = ?
                WHERE result_question_id = ?
                `,
                [newParentId, newId],
                );
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM result_questions
            WHERE version = 'P25';
        `);

    }

}
