import { MigrationInterface, QueryRunner } from "typeorm"

export class insertNewInstitutionsType1679504087806 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO institution_role (name) VALUES ('Innovation Package Partners')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
