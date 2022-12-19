import { MigrationInterface, QueryRunner } from "typeorm";

export class addIsActiveClarisaIsntitutions1671200901253 implements MigrationInterface {
    name = 'addIsActiveClarisaIsntitutions1671200901253'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` ADD \`is_active\` tinyint NULL DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` DROP COLUMN \`is_active\``);
    }

}
