import { MigrationInterface, QueryRunner } from "typeorm"

export class resultsTest1668441603340 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO
        \`prdb\`.\`result\` (
           id,
            version_id,
            result_type_id,
            created_by,
            result_level_id,
            title
        )
    VALUES
        (
            1,
            1,
            2,
            307,
            3,
            'WorldFlora: R package to standardize Plant Names According to World Flora Online Taxonomic Backbone.'
        );
        `);

        await queryRunner.query(`INSERT INTO
        \`prdb\`.\`result\` (
           id,
            version_id,
            result_type_id,
            created_by,
            result_level_id,
            title
        )
    VALUES
        (
            2,
            1,
            2,
            307,
            3,
            'World Index for Sustainability and Healthy (WISH), a globally applicable index for healthy diets from sustainable food systems'
        );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
