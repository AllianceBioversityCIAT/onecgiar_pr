import { MigrationInterface, QueryRunner } from "typeorm";

export class addResultCodeInResultTable1672862639196 implements MigrationInterface {
    name = 'addResultCodeInResultTable1672862639196'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`result_code\` bigint NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`result_code\``);
    }

}
