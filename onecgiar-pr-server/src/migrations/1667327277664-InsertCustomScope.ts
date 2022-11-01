import { MigrationInterface, QueryRunner } from "typeorm"

export class InsertCustomScope1667327277664 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `INSERT INTO \`clarisa_geographic_scope\` (id, name, description) VALUES (50, 'This is yet to be determined','')`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
