import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeFormatExplanationReadinessLevel1761712300799 implements MigrationInterface {
    name = 'ChangeFormatExplanationReadinessLevel1761712300799'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` DROP COLUMN \`readiness_level_explanation\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` ADD \`readiness_level_explanation\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` DROP COLUMN \`readiness_level_explanation\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` ADD \`readiness_level_explanation\` varchar(50) COLLATE "utf8mb3_unicode_ci" NULL`);
    }

}
