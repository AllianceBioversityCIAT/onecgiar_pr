import { MigrationInterface, QueryRunner } from "typeorm";

export class addIsLegacyInstitutionType1669738722616 implements MigrationInterface {
    name = 'addIsLegacyInstitutionType1669738722616'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` ADD \`is_legacy\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` DROP COLUMN \`is_legacy\``);
    }

}
