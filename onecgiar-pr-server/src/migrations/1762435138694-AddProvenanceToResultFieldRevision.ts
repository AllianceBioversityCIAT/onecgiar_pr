import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProvenanceToResultFieldRevision1762435138694 implements MigrationInterface {
    name = 'AddProvenanceToResultFieldRevision1762435138694'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_field_revision\` ADD \`provenance\` enum ('AI_SUGGESTED', 'USER_EDIT') NOT NULL DEFAULT 'USER_EDIT'`);
        await queryRunner.query(`ALTER TABLE \`result_field_revision\` ADD \`proposal_id\` bigint NULL`);
        await queryRunner.query(`CREATE INDEX \`IDX_result_field_revision_proposal\` ON \`result_field_revision\` (\`proposal_id\`)`);
        await queryRunner.query(`ALTER TABLE \`result_field_revision\` ADD CONSTRAINT \`FK_result_field_revision_proposal\` FOREIGN KEY (\`proposal_id\`) REFERENCES \`ai_review_proposal\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_field_revision\` DROP FOREIGN KEY \`FK_result_field_revision_proposal\``);
        await queryRunner.query(`DROP INDEX \`IDX_result_field_revision_proposal\` ON \`result_field_revision\``);
        await queryRunner.query(`ALTER TABLE \`result_field_revision\` DROP COLUMN \`proposal_id\``);
        await queryRunner.query(`ALTER TABLE \`result_field_revision\` DROP COLUMN \`provenance\``);
    }

}
