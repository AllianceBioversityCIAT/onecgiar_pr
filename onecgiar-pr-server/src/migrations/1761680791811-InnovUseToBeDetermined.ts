import { MigrationInterface, QueryRunner } from "typeorm";

export class InnovUseToBeDetermined1761680791811 implements MigrationInterface {
    name = 'InnovUseToBeDetermined1761680791811'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` ADD \`innov_use_to_be_determined\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` ADD \`innov_use_2030_to_be_determined\` tinyint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` DROP COLUMN \`innov_use_2030_to_be_determined\``);
        await queryRunner.query(`ALTER TABLE \`results_innovations_use\` DROP COLUMN \`innov_use_to_be_determined\``);
    }

}
