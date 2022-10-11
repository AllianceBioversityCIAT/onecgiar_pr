import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorResultsAll1665525396398 implements MigrationInterface {
    name = 'refactorResultsAll1665525396398'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`gender_tag_level\` DROP COLUMN \`title\``);
        await queryRunner.query(`ALTER TABLE \`gender_tag_level\` ADD \`title\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`gender_tag_level\` DROP COLUMN \`description\``);
        await queryRunner.query(`ALTER TABLE \`gender_tag_level\` ADD \`description\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`result_level\` DROP COLUMN \`name\``);
        await queryRunner.query(`ALTER TABLE \`result_level\` ADD \`name\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`result_level\` DROP COLUMN \`description\``);
        await queryRunner.query(`ALTER TABLE \`result_level\` ADD \`description\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`result_type\` DROP COLUMN \`name\``);
        await queryRunner.query(`ALTER TABLE \`result_type\` ADD \`name\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`result_type\` DROP COLUMN \`description\``);
        await queryRunner.query(`ALTER TABLE \`result_type\` ADD \`description\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`version\` DROP COLUMN \`version_name\``);
        await queryRunner.query(`ALTER TABLE \`version\` ADD \`version_name\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`version\` DROP COLUMN \`start_date\``);
        await queryRunner.query(`ALTER TABLE \`version\` ADD \`start_date\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`version\` DROP COLUMN \`end_date\``);
        await queryRunner.query(`ALTER TABLE \`version\` ADD \`end_date\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`evidence_types\` DROP COLUMN \`name\``);
        await queryRunner.query(`ALTER TABLE \`evidence_types\` ADD \`name\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`initiative_roles\` DROP COLUMN \`name\``);
        await queryRunner.query(`ALTER TABLE \`initiative_roles\` ADD \`name\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`initiative_roles\` DROP COLUMN \`description\``);
        await queryRunner.query(`ALTER TABLE \`initiative_roles\` ADD \`description\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP COLUMN \`link\``);
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD \`link\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`institution_role\` DROP COLUMN \`name\``);
        await queryRunner.query(`ALTER TABLE \`institution_role\` ADD \`name\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`institution_role\` DROP COLUMN \`name\``);
        await queryRunner.query(`ALTER TABLE \`institution_role\` ADD \`name\` varchar(50) NULL`);
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP COLUMN \`link\``);
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD \`link\` varchar(100) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`initiative_roles\` DROP COLUMN \`description\``);
        await queryRunner.query(`ALTER TABLE \`initiative_roles\` ADD \`description\` varchar(45) NULL`);
        await queryRunner.query(`ALTER TABLE \`initiative_roles\` DROP COLUMN \`name\``);
        await queryRunner.query(`ALTER TABLE \`initiative_roles\` ADD \`name\` varchar(45) NULL`);
        await queryRunner.query(`ALTER TABLE \`evidence_types\` DROP COLUMN \`name\``);
        await queryRunner.query(`ALTER TABLE \`evidence_types\` ADD \`name\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`version\` DROP COLUMN \`end_date\``);
        await queryRunner.query(`ALTER TABLE \`version\` ADD \`end_date\` varchar(45) NULL`);
        await queryRunner.query(`ALTER TABLE \`version\` DROP COLUMN \`start_date\``);
        await queryRunner.query(`ALTER TABLE \`version\` ADD \`start_date\` varchar(45) NULL`);
        await queryRunner.query(`ALTER TABLE \`version\` DROP COLUMN \`version_name\``);
        await queryRunner.query(`ALTER TABLE \`version\` ADD \`version_name\` varchar(45) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`result_type\` DROP COLUMN \`description\``);
        await queryRunner.query(`ALTER TABLE \`result_type\` ADD \`description\` varchar(500) NULL`);
        await queryRunner.query(`ALTER TABLE \`result_type\` DROP COLUMN \`name\``);
        await queryRunner.query(`ALTER TABLE \`result_type\` ADD \`name\` varchar(100) NULL`);
        await queryRunner.query(`ALTER TABLE \`result_level\` DROP COLUMN \`description\``);
        await queryRunner.query(`ALTER TABLE \`result_level\` ADD \`description\` varchar(500) NULL`);
        await queryRunner.query(`ALTER TABLE \`result_level\` DROP COLUMN \`name\``);
        await queryRunner.query(`ALTER TABLE \`result_level\` ADD \`name\` varchar(45) NULL`);
        await queryRunner.query(`ALTER TABLE \`gender_tag_level\` DROP COLUMN \`description\``);
        await queryRunner.query(`ALTER TABLE \`gender_tag_level\` ADD \`description\` varchar(500) NULL`);
        await queryRunner.query(`ALTER TABLE \`gender_tag_level\` DROP COLUMN \`title\``);
        await queryRunner.query(`ALTER TABLE \`gender_tag_level\` ADD \`title\` varchar(45) NULL`);
    }

}
