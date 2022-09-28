import { MigrationInterface, QueryRunner } from "typeorm";

export class addingStatusColumn1664395287550 implements MigrationInterface {
    name = 'addingStatusColumn1664395287550'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`status\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`created_date\``);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`created_date\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`result\` CHANGE \`last_updated_date\` \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` CHANGE \`last_updated_date\` \`last_updated_date\` timestamp(0) NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`created_date\``);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`created_date\` timestamp(0) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`status\``);
    }

}
