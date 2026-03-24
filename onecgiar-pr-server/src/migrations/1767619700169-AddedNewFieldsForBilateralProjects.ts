import { MigrationInterface, QueryRunner } from "typeorm";

export class AddedNewFieldsForBilateralProjects1767619700169 implements MigrationInterface {
    name = 'AddedNewFieldsForBilateralProjects1767619700169'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` ADD \`annual\` decimal(18,2) NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` ADD \`source_of_funding\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` ADD \`organization_code\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` ADD \`funder_code\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` ADD \`interim_director_review\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` ADD \`project_results\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` ADD \`modification_justification\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` ADD \`created_at\` timestamp(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` ADD \`updated_at\` timestamp(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` ADD \`is_active\` tinyint(1) NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` ADD \`created_by\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` ADD \`updated_by\` bigint NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_clarisa_projects_organization_code\` ON \`clarisa_projects\` (\`organization_code\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_clarisa_projects_funder_code\` ON \`clarisa_projects\` (\`funder_code\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_clarisa_projects_funder_code\` ON \`clarisa_projects\``);
        await queryRunner.query(`DROP INDEX \`IDX_clarisa_projects_organization_code\` ON \`clarisa_projects\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` DROP COLUMN \`updated_by\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` DROP COLUMN \`created_by\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` DROP COLUMN \`is_active\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` DROP COLUMN \`updated_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` DROP COLUMN \`created_at\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` DROP COLUMN \`modification_justification\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` DROP COLUMN \`project_results\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` DROP COLUMN \`interim_director_review\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` DROP COLUMN \`funder_code\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` DROP COLUMN \`organization_code\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` DROP COLUMN \`source_of_funding\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_projects\` DROP COLUMN \`annual\``);
    }

}
