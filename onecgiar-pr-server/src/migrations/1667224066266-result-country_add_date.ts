import { MigrationInterface, QueryRunner } from "typeorm";

export class resultCountryAddDate1667224066266 implements MigrationInterface {
    name = 'resultCountryAddDate1667224066266'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_country\` ADD \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`result_country\` ADD \`last_updated_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_country\` DROP COLUMN \`last_updated_date\``);
        await queryRunner.query(`ALTER TABLE \`result_country\` DROP COLUMN \`created_date\``);
    }

}
