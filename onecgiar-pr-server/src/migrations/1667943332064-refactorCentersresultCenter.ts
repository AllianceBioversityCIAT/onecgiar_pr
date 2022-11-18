import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorCentersresultCenter1667943332064 implements MigrationInterface {
    name = 'refactorCentersresultCenter1667943332064'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_center\` DROP FOREIGN KEY \`FK_8226c8a3367035d7ec411d6dd54\``);
        await queryRunner.query(`ALTER TABLE \`results_center\` DROP COLUMN \`center_id\``);
        await queryRunner.query(`ALTER TABLE \`results_center\` ADD \`center_id\` text NOT NULL`);
        await queryRunner.query(`DROP TABLE \`clarisa_center\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

    }

}
