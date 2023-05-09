import { MigrationInterface, QueryRunner } from "typeorm";

export class refactorIpsrEntity1683303016692 implements MigrationInterface {
    name = 'refactorIpsrEntity1683303016692'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP FOREIGN KEY \`FK_fd3bb5e8f8734c89becd025f786\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP COLUMN \`use_level_evidence_based\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD \`use_level_evidence_based\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD CONSTRAINT \`FK_fd3bb5e8f8734c89becd025f786\` FOREIGN KEY (\`use_level_evidence_based\`) REFERENCES \`clarisa_innovation_use_levels\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP FOREIGN KEY \`FK_fd3bb5e8f8734c89becd025f786\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` DROP COLUMN \`use_level_evidence_based\``);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD \`use_level_evidence_based\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`result_by_innovation_package\` ADD CONSTRAINT \`FK_fd3bb5e8f8734c89becd025f786\` FOREIGN KEY (\`use_level_evidence_based\`) REFERENCES \`clarisa_innovation_readiness_level\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
