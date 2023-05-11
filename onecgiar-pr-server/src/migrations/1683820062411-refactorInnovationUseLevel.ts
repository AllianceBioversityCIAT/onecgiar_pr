import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorInnovationUseLevel1683820062411 implements MigrationInterface {
    name = 'refactorInnovationUseLevel1683820062411'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_innovation_use_levels\` ADD \`definition\` text NULL`);
        await queryRunner.query(`UPDATE clarisa_innovation_use_levels SET definition = name`);
        await queryRunner.query(`UPDATE clarisa_innovation_use_levels SET name = 'No use' where level = 0`);
        await queryRunner.query(`UPDATE clarisa_innovation_use_levels SET name = 'Project lead organization' where level = 1`);
        await queryRunner.query(`UPDATE clarisa_innovation_use_levels SET name = 'Partners' where level in (2,3)`);
        await queryRunner.query(`UPDATE clarisa_innovation_use_levels SET name = 'Connected next-user' where level in (4,5)`);
        await queryRunner.query(`UPDATE clarisa_innovation_use_levels SET name = 'Unconnected next-user' where level in (6,7)`);
        await queryRunner.query(`UPDATE clarisa_innovation_use_levels SET name = 'End-user / Beneficiaries' where level in (8,9)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`clarisa_innovation_use_levels\` DROP COLUMN \`definition\``);
    }

}
