import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatedMQAPInstitutionRelations1718632548072 implements MigrationInterface {
    name = 'UpdatedMQAPInstitutionRelations1718632548072'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`FK_4b90ac3eff7c8506a362680a0e4\` ON \`results_kp_mqap_institutions\``);
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` ADD \`is_predicted\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` ADD \`result_kp_mqap_institution_id\` bigint NULL`);
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` ADD CONSTRAINT \`FK_cde539be4c36fddd0400af319b0\` FOREIGN KEY (\`result_kp_mqap_institution_id\`) REFERENCES \`results_kp_mqap_institutions\`(\`result_kp_mqap_institution_id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` DROP FOREIGN KEY \`FK_cde539be4c36fddd0400af319b0\``);
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` DROP COLUMN \`result_kp_mqap_institution_id\``);
        await queryRunner.query(`ALTER TABLE \`results_by_institution\` DROP COLUMN \`is_predicted\``);
        await queryRunner.query(`CREATE INDEX \`FK_4b90ac3eff7c8506a362680a0e4\` ON \`results_kp_mqap_institutions\` (\`results_by_institutions_id\`)`);
    }

}
