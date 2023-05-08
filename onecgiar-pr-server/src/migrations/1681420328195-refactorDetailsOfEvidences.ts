import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorDetailsOfEvidences1681420328195 implements MigrationInterface {
    name = 'refactorDetailsOfEvidences1681420328195'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP COLUMN \`details_of_evidence\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD \`use_details_of_evidence\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD \`readiness_details_of_evidence\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP COLUMN \`readiness_details_of_evidence\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP COLUMN \`use_details_of_evidence\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD \`details_of_evidence\` text CHARACTER SET "utf8mb4" COLLATE "utf8mb4_general_ci" NULL`);
    }

}
