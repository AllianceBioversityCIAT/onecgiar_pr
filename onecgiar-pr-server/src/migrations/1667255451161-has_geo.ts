import { MigrationInterface, QueryRunner } from "typeorm";

export class hasGeo1667255451161 implements MigrationInterface {
    name = 'hasGeo1667255451161'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`has_regions\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`has_countries\` tinyint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`has_countries\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`has_regions\``);
    }

}
