import { MigrationInterface, QueryRunner } from "typeorm"

export class setNewInstitutionRole1680281977175 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO institution_role (name) VALUES ('Core Innovation Package Partners')`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
