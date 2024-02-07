import { MigrationInterface, QueryRunner } from "typeorm";

export class addNewColumnForBiReport1707147750880 implements MigrationInterface {
    name = 'addNewColumnForBiReport1707147750880'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`bi_reports\` ADD \`has_full_screen\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`bi_reports\` DROP COLUMN \`has_full_screen\``);
    }
}
