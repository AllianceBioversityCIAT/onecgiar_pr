import { MigrationInterface, QueryRunner } from "typeorm";

export class AddColumnMappingWithSdgImpact1690506514575 implements MigrationInterface {
    name = 'AddColumnMappingWithSdgImpact1690506514575'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` ADD \`mapping_sdg\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` ADD \`mapping_impact\` tinyint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` DROP COLUMN \`mapping_impact\``);
        await queryRunner.query(`ALTER TABLE \`results_toc_result\` DROP COLUMN \`mapping_sdg\``);
    }

}
