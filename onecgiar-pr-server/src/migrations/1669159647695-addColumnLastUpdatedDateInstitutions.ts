import { MigrationInterface, QueryRunner } from "typeorm";

export class addColumnLastUpdatedDateInstitutions1669159647695 implements MigrationInterface {
    name = 'addColumnLastUpdatedDateInstitutions1669159647695'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` ADD \`last_updated_date\` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` DROP COLUMN \`last_updated_date\``);
    }

}
