import { MigrationInterface, QueryRunner } from "typeorm";

export class addedOtherInstitutionIpsrField1686143274172 implements MigrationInterface {
    name = 'addedOtherInstitutionIpsrField1686143274172'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_result_institution_types\` ADD \`other_institution\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_result_institution_types\` DROP COLUMN \`other_institution\``);
    }

}
