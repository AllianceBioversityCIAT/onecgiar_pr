import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedTargetNarrative1701459529009 implements MigrationInterface {
    name = 'AddedTargetNarrative1701459529009'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_indicators_targets\` ADD \`target_progress_narrative\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_indicators_targets\` DROP COLUMN \`target_progress_narrative\``);
    }

}
