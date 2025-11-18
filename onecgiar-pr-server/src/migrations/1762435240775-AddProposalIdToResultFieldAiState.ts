import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProposalIdToResultFieldAiState1762435240775 implements MigrationInterface {
    name = 'AddProposalIdToResultFieldAiState1762435240775'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_field_ai_state\` ADD \`last_ai_proposal_id\` bigint NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_result_field_ai_state_proposal\` ON \`result_field_ai_state\` (\`last_ai_proposal_id\`)`);
        await queryRunner.query(`ALTER TABLE \`result_field_ai_state\` ADD CONSTRAINT \`FK_result_field_ai_state_proposal\` FOREIGN KEY (\`last_ai_proposal_id\`) REFERENCES \`ai_review_proposal\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_field_ai_state\` DROP FOREIGN KEY \`FK_result_field_ai_state_proposal\``);
        await queryRunner.query(`DROP INDEX \`IDX_result_field_ai_state_proposal\` ON \`result_field_ai_state\``);
        await queryRunner.query(`ALTER TABLE \`result_field_ai_state\` DROP COLUMN \`last_ai_proposal_id\``);
    }

}
