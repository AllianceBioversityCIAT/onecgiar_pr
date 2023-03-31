import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorLastTables1680273207131 implements MigrationInterface {
    name = 'refactorLastTables1680273207131'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_result_actors\` ADD \`evidence_link\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_measures\` ADD \`evidence_link\` text NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_result_measures\` DROP COLUMN \`evidence_link\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_result_actors\` DROP COLUMN \`evidence_link\``);
    }

}
