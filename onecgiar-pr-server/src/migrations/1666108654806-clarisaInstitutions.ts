import { MigrationInterface, QueryRunner } from "typeorm";

export class clarisaInstitutions1666108654806 implements MigrationInterface {
    name = 'clarisaInstitutions1666108654806'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` DROP COLUMN \`is_parent\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` DROP COLUMN \`parent_id\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions_types\` DROP COLUMN \`description\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions_types\` CHANGE \`id\` \`id\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions_types\` DROP PRIMARY KEY`);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions_types\` DROP COLUMN \`id\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions_types\` ADD \`code\` int NOT NULL PRIMARY KEY AUTO_INCREMENT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_regions_types\` DROP COLUMN \`code\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions_types\` ADD \`id\` int NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions_types\` ADD PRIMARY KEY (\`id\`)`);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions_types\` CHANGE \`id\` \`id\` int NOT NULL AUTO_INCREMENT`);
        await queryRunner.query(`ALTER TABLE \`clarisa_regions_types\` ADD \`description\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` ADD \`parent_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` ADD \`is_parent\` tinyint NULL`);
    }

}
