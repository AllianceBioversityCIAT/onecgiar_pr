import { MigrationInterface, QueryRunner } from "typeorm";

export class addedKindCashColumnBudget1693404266259 implements MigrationInterface {
    name = 'addedKindCashColumnBudget1693404266259'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` ADD \`kind_cash\` decimal(10,2) NULL`);
        await queryRunner.query(`ALTER TABLE \`result_initiative_budget\` ADD \`kind_cash\` decimal(10,2) NULL`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` ADD \`kind_cash\` decimal(10,2) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` DROP COLUMN \`kind_cash\``);
        await queryRunner.query(`ALTER TABLE \`result_initiative_budget\` DROP COLUMN \`kind_cash\``);
        await queryRunner.query(`ALTER TABLE \`result_institutions_budget\` DROP COLUMN \`kind_cash\``);
    }

}
