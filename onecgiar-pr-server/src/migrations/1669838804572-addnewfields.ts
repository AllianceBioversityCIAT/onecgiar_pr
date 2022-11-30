import { MigrationInterface, QueryRunner } from "typeorm";

export class addnewfields1669838804572 implements MigrationInterface {
    name = 'addnewfields1669838804572'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`lead_contact_person\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` ADD \`innovation_acknowledgement\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` ADD \`innovation_pdf\` tinyint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` DROP COLUMN \`innovation_pdf\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_dev\` DROP COLUMN \`innovation_acknowledgement\``);
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`lead_contact_person\``);
    }

}
