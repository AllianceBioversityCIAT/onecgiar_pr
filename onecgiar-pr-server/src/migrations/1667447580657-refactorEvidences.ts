import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorEvidences1667447580657 implements MigrationInterface {
    name = 'refactorEvidences1667447580657'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP FOREIGN KEY \`FK_6721060d9e81bcf249ddaa49cba\``);
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP COLUMN \`result_evidence_id\``);
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD \`youth_related\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD \`is_supplementary\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD \`status\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD \`result_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD \`knowledge_product_related\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`evidence\` CHANGE \`gender_related\` \`gender_related\` tinyint NULL`);
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD CONSTRAINT \`FK_57e7c980734f7016db90978e17a\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD CONSTRAINT \`FK_c580e83c9bd86d9ae7139059273\` FOREIGN KEY (\`knowledge_product_related\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP FOREIGN KEY \`FK_c580e83c9bd86d9ae7139059273\``);
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP FOREIGN KEY \`FK_57e7c980734f7016db90978e17a\``);
        await queryRunner.query(`ALTER TABLE \`evidence\` CHANGE \`gender_related\` \`gender_related\` tinyint NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP COLUMN \`knowledge_product_related\``);
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP COLUMN \`result_id\``);
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP COLUMN \`status\``);
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP COLUMN \`is_supplementary\``);
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP COLUMN \`youth_related\``);
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD \`result_evidence_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD CONSTRAINT \`FK_6721060d9e81bcf249ddaa49cba\` FOREIGN KEY (\`result_evidence_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
