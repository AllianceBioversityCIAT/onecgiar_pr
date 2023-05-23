import { MigrationInterface, QueryRunner } from "typeorm";

export class addedFieldsInActorsTables1684422361342 implements MigrationInterface {
    name = 'addedFieldsInActorsTables1684422361342'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_result_actors\` ADD \`sex_and_age_disaggregation\` tinyint NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_actors\` ADD \`how_many\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_actors\` ADD \`sex_and_age_disaggregation\` tinyint NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`result_actors\` ADD \`how_many\` bigint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_actors\` DROP COLUMN \`how_many\``);
        await queryRunner.query(`ALTER TABLE \`result_actors\` DROP COLUMN \`sex_and_age_disaggregation\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_actors\` DROP COLUMN \`how_many\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_actors\` DROP COLUMN \`sex_and_age_disaggregation\``);
    }

}
