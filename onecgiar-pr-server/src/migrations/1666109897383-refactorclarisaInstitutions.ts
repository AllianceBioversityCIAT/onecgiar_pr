import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorclarisaInstitutions1666109897383 implements MigrationInterface {
    name = 'refactorclarisaInstitutions1666109897383'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` DROP FOREIGN KEY \`FK_c487f2dfe9069367da65076d0c4\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` CHANGE \`institution_type_id\` \`institution_type_code\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions_types\` CHANGE \`code\` \`id\` int NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` DROP COLUMN \`acronym\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` DROP COLUMN \`description\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` CHANGE \`id\` \`id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` DROP COLUMN \`old\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` DROP COLUMN \`sub_department_active\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` ADD \`code\` int NOT NULL PRIMARY KEY AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` ADD CONSTRAINT \`FK_a1ead859f7976b0999f889ea2cd\` FOREIGN KEY (\`institution_type_code\`) REFERENCES \`clarisa_institution_types\`(\`code\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` DROP FOREIGN KEY \`FK_a1ead859f7976b0999f889ea2cd\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` DROP COLUMN \`code\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` ADD \`sub_department_active\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` ADD \`old\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` ADD \`id\` int NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` ADD PRIMARY KEY (\`id\`)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` CHANGE \`id\` \`id\` int NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` ADD \`description\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institution_types\` ADD \`acronym\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions_types\` CHANGE \`id\` \`code\` int NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` CHANGE \`institution_type_code\` \`institution_type_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` ADD CONSTRAINT \`FK_c487f2dfe9069367da65076d0c4\` FOREIGN KEY (\`institution_type_id\`) REFERENCES \`clarisa_institution_types\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
