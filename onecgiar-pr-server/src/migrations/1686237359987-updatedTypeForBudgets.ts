import { MigrationInterface, QueryRunner } from "typeorm";

export class updatedTypeForBudgets1686237359987 implements MigrationInterface {
    name = 'updatedTypeForBudgets1686237359987'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` DROP COLUMN \`in_kind\``);
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` ADD \`in_kind\` decimal(10,2) NULL`);
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` DROP COLUMN \`in_cash\``);
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` ADD \`in_cash\` decimal(10,2) NULL`);
        await queryRunner.query(`ALTER TABLE \`result_initiative_budget\` DROP COLUMN \`current_year\``);
        await queryRunner.query(`ALTER TABLE \`result_initiative_budget\` ADD \`current_year\` decimal(10,2) NULL`);
        await queryRunner.query(`ALTER TABLE \`result_initiative_budget\` DROP COLUMN \`next_year\``);
        await queryRunner.query(`ALTER TABLE \`result_initiative_budget\` ADD \`next_year\` decimal(10,2) NULL`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` DROP COLUMN \`in_kind\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` ADD \`in_kind\` decimal(10,2) NULL`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` DROP COLUMN \`in_cash\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` ADD \`in_cash\` decimal(10,2) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` DROP COLUMN \`in_cash\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` ADD \`in_cash\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` DROP COLUMN \`in_kind\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` ADD \`in_kind\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_initiative_budget\` DROP COLUMN \`next_year\``);
        await queryRunner.query(`ALTER TABLE \`result_initiative_budget\` ADD \`next_year\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_initiative_budget\` DROP COLUMN \`current_year\``);
        await queryRunner.query(`ALTER TABLE \`result_initiative_budget\` ADD \`current_year\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` DROP COLUMN \`in_cash\``);
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` ADD \`in_cash\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` DROP COLUMN \`in_kind\``);
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` ADD \`in_kind\` bigint NULL`);
    }

}
