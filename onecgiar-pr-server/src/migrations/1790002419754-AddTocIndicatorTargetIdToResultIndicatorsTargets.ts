import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTocIndicatorTargetIdToResultIndicatorsTargets1790002419754 implements MigrationInterface {
    name = 'AddTocIndicatorTargetIdToResultIndicatorsTargets1790002419754'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_indicators_targets\` ADD \`toc_indicator_target_id\` bigint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_indicators_targets\` DROP COLUMN \`toc_indicator_target_id\``);
    }

}
