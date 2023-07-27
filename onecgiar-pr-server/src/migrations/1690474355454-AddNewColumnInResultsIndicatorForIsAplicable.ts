import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumnInResultsIndicatorForIsAplicable1690474355454 implements MigrationInterface {
    name = 'AddNewColumnInResultsIndicatorForIsAplicable1690474355454'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_toc_result_indicators\` ADD \`is_not_aplicable\` tinyint NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_toc_result_indicators\` DROP COLUMN \`is_not_aplicable\``);
    }

}
