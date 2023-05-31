import { MigrationInterface, QueryRunner } from "typeorm";

export class ipsrPdfReport1685028864950 implements MigrationInterface {
    name = 'ipsrPdfReport1685028864950'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` ADD \`ipsr_pdf_report\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_innovation_package\` DROP COLUMN \`ipsr_pdf_report\``);
    }

}
