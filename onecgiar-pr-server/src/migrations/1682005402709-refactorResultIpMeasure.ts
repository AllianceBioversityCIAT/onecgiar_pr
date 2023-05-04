import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorResultIpMeasure1682005402709 implements MigrationInterface {
    name = 'refactorResultIpMeasure1682005402709'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_measure\` DROP COLUMN \`quantity\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_measure\` ADD \`quantity\` float NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_ip_measure\` DROP COLUMN \`quantity\``);
        await queryRunner.query(`ALTER TABLE \`result_ip_measure\` ADD \`quantity\` bigint NULL`);
    }

}
