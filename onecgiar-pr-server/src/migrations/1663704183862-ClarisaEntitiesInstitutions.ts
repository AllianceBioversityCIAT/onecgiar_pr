import { MigrationInterface, QueryRunner } from "typeorm";

export class ClarisaEntitiesInstitutions1663704183862 implements MigrationInterface {
    name = 'ClarisaEntitiesInstitutions1663704183862'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` ADD \`name\` text NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` ADD \`acronym\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` ADD \`website_link\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` ADD \`parent_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` ADD \`is_parent\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` ADD \`institution_type_id\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` ADD CONSTRAINT \`FK_c487f2dfe9069367da65076d0c4\` FOREIGN KEY (\`institution_type_id\`) REFERENCES \`institution_types\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` DROP FOREIGN KEY \`FK_c487f2dfe9069367da65076d0c4\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` DROP COLUMN \`institution_type_id\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` DROP COLUMN \`is_parent\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` DROP COLUMN \`parent_id\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` DROP COLUMN \`website_link\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` DROP COLUMN \`acronym\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_institutions\` DROP COLUMN \`name\``);
    }

}
