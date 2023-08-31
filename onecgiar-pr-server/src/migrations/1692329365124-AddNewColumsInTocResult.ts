import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNewColumsInTocResult1692329365124 implements MigrationInterface {
    name = 'AddNewColumsInTocResult1692329365124'

    public async up(queryRunner: QueryRunner): Promise<void> {
       
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` ADD \`is_sdg_action_impact\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` ADD \`version_dashboard_id\` text NULL`);
        
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
       
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` DROP COLUMN \`version_dashboard_id\``);
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` DROP COLUMN \`is_sdg_action_impact\``);
        
    }

}
