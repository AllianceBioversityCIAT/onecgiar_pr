import { MigrationInterface, QueryRunner } from "typeorm";

export class updatedTypeForGraduateStudentsColumn1686239862051 implements MigrationInterface {
    name = 'updatedTypeForGraduateStudentsColumn1686239862051'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_result_institution_types\` DROP COLUMN \`graduate_students\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_institution_types\` ADD \`graduate_students\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`graduate_students\``);
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` ADD \`graduate_students\` bigint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`graduate_students\``);
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` ADD \`graduate_students\` text COLLATE "utf8mb3_unicode_ci" NULL`);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_institution_types\` DROP COLUMN \`graduate_students\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_institution_types\` ADD \`graduate_students\` text NULL`);
    }

}
