import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorInstitutionsType1679680389008 implements MigrationInterface {
    name = 'refactorInstitutionsType1679680389008'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` ADD \`how_many\` bigint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_by_institution_type\` DROP COLUMN \`how_many\``);
    }

}
