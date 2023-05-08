import { MigrationInterface, QueryRunner } from "typeorm"

export class addTypeIpsrRole1680032540433 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO result_by_level (result_level_id, result_type_id) VALUES (4, 10)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
