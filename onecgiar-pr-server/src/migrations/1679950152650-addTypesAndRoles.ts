import { MigrationInterface, QueryRunner } from "typeorm"

export class addTypesAndRoles1679950152650 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO result_type (name) VALUES ('Complementary innovation')`);
        await queryRunner.query(`INSERT INTO result_by_level (result_level_id, result_type_id) VALUES (4, 11)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
