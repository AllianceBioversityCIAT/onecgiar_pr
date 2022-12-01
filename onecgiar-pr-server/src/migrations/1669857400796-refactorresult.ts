import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorresult1669857400796 implements MigrationInterface {
    name = 'refactorresult1669857400796'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`lead_contact_person\``);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`lead_contact_person\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`lead_contact_person\``);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`lead_contact_person\` tinyint NULL`);
    }

}
