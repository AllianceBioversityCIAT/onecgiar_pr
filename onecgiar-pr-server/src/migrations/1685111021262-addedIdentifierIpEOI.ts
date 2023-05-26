import { MigrationInterface, QueryRunner } from "typeorm";

export class addedIdentifierIpEOI1685111021262 implements MigrationInterface {
    name = 'addedIdentifierIpEOI1685111021262'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_eoi_outcomes\` ADD \`contributing_toc\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_eoi_outcomes\` DROP COLUMN \`contributing_toc\``);
    }

}
