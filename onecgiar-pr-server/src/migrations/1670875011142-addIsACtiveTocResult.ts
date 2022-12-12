import { MigrationInterface, QueryRunner } from "typeorm";

export class addIsACtiveTocResult1670875011142 implements MigrationInterface {
    name = 'addIsACtiveTocResult1670875011142'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`toc_result\` ADD \`is_active\` tinyint NOT NULL DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`toc_result\` DROP COLUMN \`is_active\``);
    }

}
