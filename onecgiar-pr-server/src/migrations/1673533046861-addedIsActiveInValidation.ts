import { MigrationInterface, QueryRunner } from "typeorm";

export class addedIsActiveInValidation1673533046861 implements MigrationInterface {
    name = 'addedIsActiveInValidation1673533046861'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`validation\` ADD \`is_active\` tinyint NOT NULL DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`validation\` DROP COLUMN \`is_active\``);
    }

}
