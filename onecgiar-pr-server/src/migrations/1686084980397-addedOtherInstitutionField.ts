import { MigrationInterface, QueryRunner } from "typeorm";

export class addedOtherInstitutionField1686084980397 implements MigrationInterface {
    name = 'addedOtherInstitutionField1686084980397'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` ADD \`other_institution\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`other_institution\``);
    }

}
