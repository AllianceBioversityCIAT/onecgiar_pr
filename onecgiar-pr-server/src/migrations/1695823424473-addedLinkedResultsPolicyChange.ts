import { MigrationInterface, QueryRunner } from "typeorm";

export class addedLinkedResultsPolicyChange1695823424473 implements MigrationInterface {
    name = 'addedLinkedResultsPolicyChange1695823424473'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` ADD \`linked_innovation_dev\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` ADD \`linked_innovation_use\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` DROP COLUMN \`linked_innovation_use\``);
        await queryRunner.query(`ALTER TABLE \`results_policy_changes\` DROP COLUMN \`linked_innovation_dev\``);
    }

}
