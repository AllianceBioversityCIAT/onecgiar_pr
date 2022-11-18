import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorCenters1667942829801 implements MigrationInterface {
    name = 'refactorCenters1667942829801'

    public async up(queryRunner: QueryRunner): Promise<void> {
        //await queryRunner.query(`DROP TABLE \`clarisa_center\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {

    }

}
