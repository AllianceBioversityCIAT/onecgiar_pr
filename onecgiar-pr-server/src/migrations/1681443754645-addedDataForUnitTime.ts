import { MigrationInterface, QueryRunner } from "typeorm"

export class addedDataForUnitTime1681443754645 implements MigrationInterface {
    name = 'addedDataForUnitTime1681443754645'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        INSERT INTO unit_time (name)
        VALUES ('Month(s)'),
               ('Years(s)');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
