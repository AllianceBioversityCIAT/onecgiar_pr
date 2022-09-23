import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorClarisaTables1663805319227 implements MigrationInterface {
    name = 'refactorClarisaTables1663805319227'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_countries_regions\` DROP COLUMN \`active\``);
        await queryRunner.query(`ALTER TABLE \`clarisa_melia_study_type\` DROP COLUMN \`active\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_melia_study_type\` ADD \`active\` int NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`clarisa_countries_regions\` ADD \`active\` tinyint NOT NULL DEFAULT '1'`);
    }

}
