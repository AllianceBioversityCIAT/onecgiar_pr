import { MigrationInterface, QueryRunner } from "typeorm"

export class updatedResultByLevel1683227347926 implements MigrationInterface {
    name = 'updatedResultByLevel1683227347926'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE
            result_by_level
        SET
            result_level_id = 3
        WHERE
            id = 14;
        `);

        await queryRunner.query(`
        UPDATE
            result_by_level
        SET
            result_level_id = 3
        WHERE
            id = 15;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
