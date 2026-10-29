// @akili-spec quality-assurance/qa-intake
import { MigrationInterface, QueryRunner } from "typeorm";

export class AddResultQaIntakeLog1793283760300 implements MigrationInterface {
    name = 'AddResultQaIntakeLog1793283760300'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`result_qa_intake_log\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`action\` varchar(20) NOT NULL, \`phase_year\` int NOT NULL, \`platform_id\` int NOT NULL, \`platform_acronym\` varchar(50) NOT NULL, \`created_date\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX \`idx_result_qa_intake_log_result_id\` (\`result_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`result_qa_intake_log\` ADD CONSTRAINT \`FK_a0e1456caee49d4cde8ec8e0f4b\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_qa_intake_log\` DROP FOREIGN KEY \`FK_a0e1456caee49d4cde8ec8e0f4b\``);
        await queryRunner.query(`DROP INDEX \`idx_result_qa_intake_log_result_id\` ON \`result_qa_intake_log\``);
        await queryRunner.query(`DROP TABLE \`result_qa_intake_log\``);
    }

}
