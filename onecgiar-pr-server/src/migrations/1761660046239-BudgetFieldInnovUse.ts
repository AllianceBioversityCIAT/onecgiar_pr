import { MigrationInterface, QueryRunner } from "typeorm";

export class BudgetFieldInnovUse1761660046239 implements MigrationInterface {
    name = 'BudgetFieldInnovUse1761660046239'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` ADD \`result_project_id\` int NULL`);
        const [fk] = await queryRunner.query(`
            SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_NAME = 'non_pooled_projetct_budget'
            AND CONSTRAINT_NAME = 'FK_d3a109bf4f7424589fe3768943a'
        `);

        if (fk) {
        await queryRunner.query(`
            ALTER TABLE \`non_pooled_projetct_budget\` 
            DROP FOREIGN KEY \`FK_d3a109bf4f7424589fe3768943a\`
        `);
        }
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` CHANGE \`non_pooled_projetct_id\` \`non_pooled_projetct_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` ADD CONSTRAINT \`FK_d3a109bf4f7424589fe3768943a\` FOREIGN KEY (\`non_pooled_projetct_id\`) REFERENCES \`non_pooled_project\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` ADD CONSTRAINT \`FK_0d135321a07e0b6cf937e35e92b\` FOREIGN KEY (\`result_project_id\`) REFERENCES \`results_by_projects\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` DROP FOREIGN KEY \`FK_0d135321a07e0b6cf937e35e92b\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` DROP FOREIGN KEY \`FK_d3a109bf4f7424589fe3768943a\``);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` CHANGE \`non_pooled_projetct_id\` \`non_pooled_projetct_id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` ADD CONSTRAINT \`FK_d3a109bf4f7424589fe3768943a\` FOREIGN KEY (\`non_pooled_projetct_id\`) REFERENCES \`non_pooled_project\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`non_pooled_projetct_budget\` DROP COLUMN \`result_project_id\``);
    }

}
