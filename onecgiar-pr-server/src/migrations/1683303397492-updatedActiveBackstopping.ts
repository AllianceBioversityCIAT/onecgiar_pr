import { MigrationInterface, QueryRunner } from "typeorm"

export class updatedActiveBackstopping1683303397492 implements MigrationInterface {
    name: 'updatedActiveBackstopping1683303397492';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        UPDATE
            active_backstopping
        SET
            name = 'Yes'
        WHERE
            active_backstopping_id = 1;
        `);
        
        await queryRunner.query(`
        DELETE FROM
            active_backstopping
        WHERE
            active_backstopping_id = 3;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
