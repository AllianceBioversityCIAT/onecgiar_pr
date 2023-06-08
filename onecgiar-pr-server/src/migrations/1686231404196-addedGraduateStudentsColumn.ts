import { MigrationInterface, QueryRunner } from "typeorm";

export class addedGraduateStudentsColumn1686231404196 implements MigrationInterface {
    name = 'addedGraduateStudentsColumn1686231404196'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_result_institution_types\` ADD \`graduate_students\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` ADD \`graduate_students\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`graduate_students\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_institution_types\` DROP COLUMN \`graduate_students\``);
    }

}
