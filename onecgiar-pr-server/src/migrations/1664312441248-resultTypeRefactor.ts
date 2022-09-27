import { MigrationInterface, QueryRunner } from "typeorm"

export class resultTypeRefactor1664312441248 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_type\` DROP FOREIGN KEY \`FK_233cb9e7b135101e29167e03e44\``);
        await queryRunner.query(`ALTER TABLE \`result_type\` DROP COLUMN \`resultLevelIdId\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
