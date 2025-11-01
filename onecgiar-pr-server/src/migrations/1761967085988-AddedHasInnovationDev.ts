import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedHasInnovationDev1761967085988 implements MigrationInterface {
    name = 'AddedHasInnovationDev1761967085988'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` ADD \`has_innovation_link\` tinyint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` DROP COLUMN \`has_innovation_link\``);
    }

}
