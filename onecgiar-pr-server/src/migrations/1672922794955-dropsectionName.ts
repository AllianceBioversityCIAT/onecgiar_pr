import { MigrationInterface, QueryRunner } from "typeorm";

export class dropsectionName1672922794955 implements MigrationInterface {
    name = 'dropsectionName1672922794955'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`validation\` DROP COLUMN \`section_seven_name\``);
        await queryRunner.query(`ALTER TABLE \`validation\` DROP COLUMN \`general_information_name\``);
        await queryRunner.query(`ALTER TABLE \`validation\` DROP COLUMN \`theory_of_change_name\``);
        await queryRunner.query(`ALTER TABLE \`validation\` DROP COLUMN \`partners_name\``);
        await queryRunner.query(`ALTER TABLE \`validation\` DROP COLUMN \`geographic_location_name\``);
        await queryRunner.query(`ALTER TABLE \`validation\` DROP COLUMN \`links_to_results_name\``);
        await queryRunner.query(`ALTER TABLE \`validation\` DROP COLUMN \`evidence_name\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`validation\` ADD \`evidence_name\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`validation\` ADD \`links_to_results_name\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`validation\` ADD \`geographic_location_name\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`validation\` ADD \`partners_name\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`validation\` ADD \`theory_of_change_name\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`validation\` ADD \`general_information_name\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`validation\` ADD \`section_seven_name\` text NULL`);
    }

}
