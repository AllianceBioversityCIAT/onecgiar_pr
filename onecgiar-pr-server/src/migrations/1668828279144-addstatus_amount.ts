import { MigrationInterface, QueryRunner } from "typeorm";

export class addstatusAmount1668828279144 implements MigrationInterface {
    name = 'addstatusAmount1668828279144'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` ADD \`status_amount\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` DROP COLUMN \`status_amount\``);
    }

}
