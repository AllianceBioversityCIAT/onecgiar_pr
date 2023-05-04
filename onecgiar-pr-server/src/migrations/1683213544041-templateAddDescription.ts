import { MigrationInterface, QueryRunner } from "typeorm";

export class TemplateAddDescription1683213544041 implements MigrationInterface {
    name = 'TemplateAddDescription1683213544041'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` DROP FOREIGN KEY \`FK_5947d17e7528046fc45e2d15401\``);
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` DROP COLUMN \`action_area_id\``);
        await queryRunner.query(`ALTER TABLE \`template\` ADD \`description\` text NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`template\` DROP COLUMN \`description\``);
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` ADD \`action_area_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` ADD CONSTRAINT \`FK_5947d17e7528046fc45e2d15401\` FOREIGN KEY (\`action_area_id\`) REFERENCES \`clarisa_action_area\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
