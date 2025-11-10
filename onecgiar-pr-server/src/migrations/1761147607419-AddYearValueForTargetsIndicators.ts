import { MigrationInterface, QueryRunner } from "typeorm";

export class AddYearValueForTargetsIndicators1761147607419 implements MigrationInterface {
    name = 'AddYearValueForTargetsIndicators1761147607419'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_indicators_targets\` ADD \`target_date\` int NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_indicators_targets\` DROP COLUMN \`target_date\``);
    }

}
