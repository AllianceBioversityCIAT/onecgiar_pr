import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewRequestStatusDraft1770336723684 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO request_status (name, description)
            SELECT 'Draft', 'Bilateral draft request'
            WHERE NOT EXISTS (
              SELECT 1
              FROM request_status
              WHERE name = 'Draft'
            );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM request_status
            WHERE name = 'Draft'
              AND description = 'Bilateral draft request';
        `);
    }

}
