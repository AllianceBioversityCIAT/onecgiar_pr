import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsActiveToClarisaCenter1786480549228 implements MigrationInterface {
    name = 'AddIsActiveToClarisaCenter1786480549228'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_center\` ADD \`is_active\` tinyint NOT NULL DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_center\` DROP COLUMN \`is_active\``);
    }

}
