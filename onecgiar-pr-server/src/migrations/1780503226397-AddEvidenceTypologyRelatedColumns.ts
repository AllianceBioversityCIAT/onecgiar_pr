import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEvidenceTypologyRelatedColumns1780503226397 implements MigrationInterface {
    name = 'AddEvidenceTypologyRelatedColumns1780503226397'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD \`policy_change_related\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD \`capacity_sharing_related\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD \`other_output_related\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD \`other_outcome_related\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD \`knowledge_product_metadata_related\` tinyint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP COLUMN \`knowledge_product_metadata_related\``);
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP COLUMN \`other_outcome_related\``);
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP COLUMN \`other_output_related\``);
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP COLUMN \`capacity_sharing_related\``);
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP COLUMN \`policy_change_related\``);
    }

}
