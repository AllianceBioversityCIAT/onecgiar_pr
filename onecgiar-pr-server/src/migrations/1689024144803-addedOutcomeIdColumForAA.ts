import { MigrationInterface, QueryRunner } from "typeorm";

export class addedOutcomeIdColumForAA1689024144803 implements MigrationInterface {
    name = 'addedOutcomeIdColumForAA1689024144803'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_action_area_outcome\` ADD \`outcomeId\` bigint NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_action_area_outcome\` DROP COLUMN \`outcomeId\``);
    }

}
