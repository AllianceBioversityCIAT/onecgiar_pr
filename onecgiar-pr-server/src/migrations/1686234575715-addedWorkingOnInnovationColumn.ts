import { MigrationInterface, QueryRunner } from "typeorm";

export class addedWorkingOnInnovationColumn1686234575715 implements MigrationInterface {
    name = 'addedWorkingOnInnovationColumn1686234575715'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_complementary_innovation\` ADD \`projects_organizations_working_on_innovation\` tinyint NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`results_complementary_innovation\` ADD \`specify_projects_organizations\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_complementary_innovation\` DROP COLUMN \`specify_projects_organizations\``);
        await queryRunner.query(`ALTER TABLE \`results_complementary_innovation\` DROP COLUMN \`projects_organizations_working_on_innovation\``);
    }

}
