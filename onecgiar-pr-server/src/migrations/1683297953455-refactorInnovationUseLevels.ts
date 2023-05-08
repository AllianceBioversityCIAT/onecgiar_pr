import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorInnovationUseLevels1683297953455 implements MigrationInterface {
    name = 'refactorInnovationUseLevels1683297953455'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_innovation_use_levels\` ADD \`level\` int NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_innovation_use_levels\` DROP COLUMN \`level\``);
    }

}
