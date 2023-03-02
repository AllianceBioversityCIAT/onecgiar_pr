import { MigrationInterface, QueryRunner } from "typeorm";

export class dateColumnsWereAddedToTheValidationTable1677770082753 implements MigrationInterface {
    name = 'dateColumnsWereAddedToTheValidationTable1677770082753'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`validation\` ADD \`created_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`validation\` ADD \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`validation\` DROP COLUMN \`last_updated_date\``);
        await queryRunner.query(`ALTER TABLE \`validation\` DROP COLUMN \`created_date\``);
    }

}
