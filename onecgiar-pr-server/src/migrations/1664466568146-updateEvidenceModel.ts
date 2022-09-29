import { MigrationInterface, QueryRunner } from "typeorm";

export class updateEvidenceModel1664466568146 implements MigrationInterface {
    name = 'updateEvidenceModel1664466568146'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD \`gender_related\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD \`result_evidence_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`evidence\` ADD CONSTRAINT \`FK_6721060d9e81bcf249ddaa49cba\` FOREIGN KEY (\`result_evidence_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP FOREIGN KEY \`FK_6721060d9e81bcf249ddaa49cba\``);
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP COLUMN \`result_evidence_id\``);
        await queryRunner.query(`ALTER TABLE \`evidence\` DROP COLUMN \`gender_related\``);
    }

}
