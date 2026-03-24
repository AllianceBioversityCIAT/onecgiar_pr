import { MigrationInterface, QueryRunner } from "typeorm";

export class ResultManagementNewFieldsToSave1760597435440 implements MigrationInterface {
    name = 'ResultManagementNewFieldsToSave1760597435440'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`external_submitter\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`external_submitted_date\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`external_submitted_comment\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`external_submitted_comment\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`external_submitted_date\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`external_submitter\``);
    }

}
