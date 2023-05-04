import { MigrationInterface, QueryRunner } from "typeorm"

export class updateExpectedPartner1681501791036 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`        
        INSERT INTO institution_role (name)
        VALUES ('expected_partner');
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
