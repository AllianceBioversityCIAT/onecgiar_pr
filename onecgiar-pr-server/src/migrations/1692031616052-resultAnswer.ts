import { MigrationInterface, QueryRunner } from "typeorm";

export class resultAnswer1692031616052 implements MigrationInterface {
    name = 'resultAnswer1692031616052'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_answers\` ADD \`is_active\` tinyint NOT NULL DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE \`result_answers\` ADD \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`result_answers\` ADD \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`result_answers\` ADD \`created_by\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_answers\` ADD \`last_updated_by\` bigint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_answers\` DROP COLUMN \`last_updated_by\``);
        await queryRunner.query(`ALTER TABLE \`result_answers\` DROP COLUMN \`created_by\``);
        await queryRunner.query(`ALTER TABLE \`result_answers\` DROP COLUMN \`last_updated_date\``);
        await queryRunner.query(`ALTER TABLE \`result_answers\` DROP COLUMN \`created_date\``);
        await queryRunner.query(`ALTER TABLE \`result_answers\` DROP COLUMN \`is_active\``);
    }

}
