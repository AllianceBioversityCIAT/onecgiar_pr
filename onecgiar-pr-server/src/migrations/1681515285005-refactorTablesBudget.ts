import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorTablesBudget1681515285005 implements MigrationInterface {
    name = 'refactorTablesBudget1681515285005'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` DROP COLUMN \`current_year\``);
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` DROP COLUMN \`next_year\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` DROP COLUMN \`current_year\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` DROP COLUMN \`next_year\``);
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` ADD \`in_kind\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` ADD \`in_cash\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` ADD \`in_kind\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` ADD \`in_cash\` bigint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` DROP COLUMN \`in_cash\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` DROP COLUMN \`in_kind\``);
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` DROP COLUMN \`in_cash\``);
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` DROP COLUMN \`in_kind\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` ADD \`next_year\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` ADD \`current_year\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` ADD \`next_year\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` ADD \`current_year\` bigint NULL`);
    }

}
