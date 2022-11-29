import { MigrationInterface, QueryRunner } from "typeorm";

export class addplannedResult1669657473150 implements MigrationInterface {
    name = 'addplannedResult1669657473150'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`share_result_request\` ADD \`planned_result\` tinyint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`share_result_request\` DROP COLUMN \`planned_result\``);
    }

}
