import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorResultTitle1665755597434 implements MigrationInterface {
    name = 'refactorResultTitle1665755597434'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`title\``);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`title\` text NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result\` DROP COLUMN \`title\``);
        await queryRunner.query(`ALTER TABLE \`result\` ADD \`title\` varchar(45) NOT NULL`);
    }

}
