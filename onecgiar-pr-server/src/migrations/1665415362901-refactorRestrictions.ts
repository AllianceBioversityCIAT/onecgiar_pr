import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorRestrictions1665415362901 implements MigrationInterface {
    name = 'refactorRestrictions1665415362901'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`restriction\` ADD \`endpoint\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`restriction\` ADD \`action\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`restriction\` ADD \`description\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`restriction\` ADD \`active\` tinyint NOT NULL DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE \`restriction\` ADD \`is_back\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`restriction\` DROP COLUMN \`is_back\``);
        await queryRunner.query(`ALTER TABLE \`restriction\` DROP COLUMN \`active\``);
        await queryRunner.query(`ALTER TABLE \`restriction\` DROP COLUMN \`description\``);
        await queryRunner.query(`ALTER TABLE \`restriction\` DROP COLUMN \`action\``);
        await queryRunner.query(`ALTER TABLE \`restriction\` DROP COLUMN \`endpoint\``);
    }

}
