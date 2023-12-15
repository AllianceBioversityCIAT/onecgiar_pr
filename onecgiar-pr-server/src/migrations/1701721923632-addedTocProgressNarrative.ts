import { MigrationInterface, QueryRunner } from "typeorm";

export class addedTocProgressNarrative1701721923632 implements MigrationInterface {
    name = 'addedTocProgressNarrative1701721923632'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` ADD \`toc_progressive_narrative\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` DROP COLUMN \`toc_progressive_narrative\``);
    }

}
