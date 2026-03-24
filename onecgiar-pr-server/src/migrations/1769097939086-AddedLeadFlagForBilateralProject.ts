import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedLeadFlagForBilateralProject1769097939086 implements MigrationInterface {
    name = 'AddedLeadFlagForBilateralProject1769097939086'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_by_projects\` ADD \`is_lead\` tinyint NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_by_projects\` DROP COLUMN \`is_lead\``);
    }

}
