import { MigrationInterface, QueryRunner } from "typeorm";

export class HasInnovationLinkInnovUseV21761451437833 implements MigrationInterface {
    name = 'HasInnovationLinkInnovUseV21761451437833'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` ADD \`has_innovation_link\` tinyint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` DROP COLUMN \`has_innovation_link\``);
    }

}
