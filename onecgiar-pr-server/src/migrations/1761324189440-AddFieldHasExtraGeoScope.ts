import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFieldHasExtraGeoScope1761324189440 implements MigrationInterface {
    name = 'AddFieldHasExtraGeoScope1761324189440'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`has_extra_geo_scope\` tinyint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`has_extra_geo_scope\``);
    }

}
