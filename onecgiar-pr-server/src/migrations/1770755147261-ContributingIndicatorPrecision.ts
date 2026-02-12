import { MigrationInterface, QueryRunner } from "typeorm";

export class ContributingIndicatorPrecision1770755147261 implements MigrationInterface {
    name = 'ContributingIndicatorPrecision1770755147261'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_indicators_targets\` CHANGE \`contributing_indicator\` \`contributing_indicator\` decimal(12,2) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_indicators_targets\` CHANGE \`contributing_indicator\` \`contributing_indicator\` decimal(9,2) NULL`);
    }

}
