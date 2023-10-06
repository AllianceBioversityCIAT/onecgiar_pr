import { MigrationInterface, QueryRunner } from "typeorm";

export class addedResultEngagementPolicy1696360983681 implements MigrationInterface {
    name = 'addedResultEngagementPolicy1696360983681'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` ADD \`result_related_engagement\` tinyint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` DROP COLUMN \`result_related_engagement\``);
    }

}
