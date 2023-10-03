import { MigrationInterface, QueryRunner } from "typeorm";

export class addedCapDev1695306014468 implements MigrationInterface {
    name = 'addedCapDev1695306014468'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` ADD \`non_binary_using\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` ADD \`has_unkown_using\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` ADD \`unkown_using\` tinyint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` DROP COLUMN \`unkown_using\``);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` DROP COLUMN \`has_unkown_using\``);
        await queryRunner.query(`ALTER TABLE \`results_capacity_developments\` DROP COLUMN \`non_binary_using\``);
    }

}
