import { MigrationInterface, QueryRunner } from "typeorm"

export class refactorClarisaRegionsContries1665605196135 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`clarisa_countries_regions\``);
        await queryRunner.query(`DROP TABLE \`clarisa_regions\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
