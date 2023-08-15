import { MigrationInterface, QueryRunner } from "typeorm";

export class addedEvidenceRelatedForDAC1688664374102 implements MigrationInterface {
    name = 'addedEvidenceRelatedForDAC1688664374102'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD \`nutrition_related\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD \`environmental_biodiversity_related\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD \`poverty_related\` tinyint NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP COLUMN \`poverty_related\``);
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP COLUMN \`environmental_biodiversity_related\``);
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP COLUMN \`nutrition_related\``);
    }

}
