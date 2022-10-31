import { MigrationInterface, QueryRunner } from "typeorm";

export class resultCountryaddisactive1667222914393 implements MigrationInterface {
    name = 'resultCountryaddisactive1667222914393'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result-country\` ADD \`is_active\` tinyint NOT NULL DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result-country\` DROP COLUMN \`is_active\``);
    }

}
