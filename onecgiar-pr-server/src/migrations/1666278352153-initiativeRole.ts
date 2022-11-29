import { MigrationInterface, QueryRunner } from "typeorm"

export class initiativeRole1666278352153 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `update \`initiative_roles\` set name = 'Owner' where id = 1;`,
        );
        await queryRunner.query(
            `update \`initiative_roles\` set name = 'Contributor' where id = 2;`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
