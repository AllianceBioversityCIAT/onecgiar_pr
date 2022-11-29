import { MigrationInterface, QueryRunner } from "typeorm"

export class addNewInstitutionsRoles1668776106254 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `INSERT INTO \`institution_role\` (name) VALUES ('Capdev trainees on behalf'),('Policy owner')`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
