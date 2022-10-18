import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorResultKrs1665778834922 implements MigrationInterface {
    name = 'refactorResultKrs1665778834922'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`krs_url\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`is_krs\` tinyint NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`is_krs\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`krs_url\``);
    }

}
