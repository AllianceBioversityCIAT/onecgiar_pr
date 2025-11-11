import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAIReviewTables1762374701275 implements MigrationInterface {
    name = 'AddAIReviewTables1762374701275'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`ai_review_proposal\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`session_id\` bigint NOT NULL, \`field_name\` enum ('title', 'description', 'short_title') NOT NULL, \`original_text\` longtext COLLATE "utf8mb3_unicode_ci" NULL, \`proposed_text\` longtext COLLATE "utf8mb3_unicode_ci" NULL, \`needs_improvement\` tinyint NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_ai_review_proposal_session_field\` (\`session_id\`, \`field_name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`ai_review_event\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`session_id\` bigint NOT NULL, \`result_id\` bigint NOT NULL, \`user_id\` int NOT NULL, \`field_name\` enum ('title', 'description', 'short_title') NULL, \`event_type\` enum ('CLICK_REVIEW', 'APPLY_PROPOSAL', 'SAVE_CHANGES', 'CLOSE_MODAL', 'REGENERATE') NOT NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_ai_review_event_evt_field\` (\`event_type\`, \`field_name\`), INDEX \`IDX_ai_review_event_result\` (\`result_id\`), INDEX \`IDX_ai_review_event_session\` (\`session_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`ai_review_session\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`opened_by\` int NOT NULL, \`opened_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`closed_at\` timestamp(6) NULL, \`all_sections_completed\` tinyint NOT NULL DEFAULT '0', \`request_payload\` json NULL, \`response_payload\` json NULL, \`status\` enum ('COMPLETED', 'PARTIAL', 'FAILED') NOT NULL DEFAULT 'COMPLETED', INDEX \`IDX_ai_review_session_result\` (\`result_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`result_field_revision\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`user_id\` int NOT NULL, \`field_name\` enum ('title', 'description', 'short_title') NOT NULL, \`old_value\` longtext COLLATE "utf8mb3_unicode_ci" NULL, \`new_value\` longtext COLLATE "utf8mb3_unicode_ci" NULL, \`change_reason\` varchar(255) NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_result_field_revision_user\` (\`user_id\`), INDEX \`IDX_result_field_revision_result_field\` (\`result_id\`, \`field_name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`result_field_ai_state\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`result_id\` bigint NOT NULL, \`field_name\` enum ('title', 'description', 'short_title') NOT NULL, \`status\` enum ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'PENDING', \`ai_suggestion\` longtext COLLATE "utf8mb3_unicode_ci" NULL, \`user_feedback\` varchar(500) NULL, \`last_updated_by\` int NULL, \`created_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX \`IDX_result_field_ai_state_user\` (\`last_updated_by\`), UNIQUE INDEX \`IDX_result_field_ai_state_result_field\` (\`result_id\`, \`field_name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`ai_review_proposal\` ADD CONSTRAINT \`FK_482b6f0c0abac9aad92da6afa52\` FOREIGN KEY (\`session_id\`) REFERENCES \`ai_review_session\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`ai_review_event\` ADD CONSTRAINT \`FK_67d905c114e12a663d33ee7b22b\` FOREIGN KEY (\`session_id\`) REFERENCES \`ai_review_session\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`ai_review_event\` ADD CONSTRAINT \`FK_88a9caa9341701f6e7a86f0d95c\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`ai_review_session\` ADD CONSTRAINT \`FK_07a609728feb012539db97916c3\` FOREIGN KEY (\`opened_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_field_revision\` ADD CONSTRAINT \`FK_b1f6533912f968aac5cb780b627\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`result_field_ai_state\` ADD CONSTRAINT \`FK_9edb2cf05123bab7c811ed8e539\` FOREIGN KEY (\`last_updated_by\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`result_field_ai_state\` DROP FOREIGN KEY \`FK_9edb2cf05123bab7c811ed8e539\``);
        await queryRunner.query(`ALTER TABLE \`result_field_revision\` DROP FOREIGN KEY \`FK_b1f6533912f968aac5cb780b627\``);
        await queryRunner.query(`ALTER TABLE \`ai_review_session\` DROP FOREIGN KEY \`FK_07a609728feb012539db97916c3\``);
        await queryRunner.query(`ALTER TABLE \`ai_review_event\` DROP FOREIGN KEY \`FK_88a9caa9341701f6e7a86f0d95c\``);
        await queryRunner.query(`ALTER TABLE \`ai_review_event\` DROP FOREIGN KEY \`FK_67d905c114e12a663d33ee7b22b\``);
        await queryRunner.query(`ALTER TABLE \`ai_review_proposal\` DROP FOREIGN KEY \`FK_482b6f0c0abac9aad92da6afa52\``);
        await queryRunner.query(`DROP INDEX \`IDX_result_field_ai_state_result_field\` ON \`result_field_ai_state\``);
        await queryRunner.query(`DROP INDEX \`IDX_result_field_ai_state_user\` ON \`result_field_ai_state\``);
        await queryRunner.query(`DROP TABLE \`result_field_ai_state\``);
        await queryRunner.query(`DROP INDEX \`IDX_result_field_revision_result_field\` ON \`result_field_revision\``);
        await queryRunner.query(`DROP INDEX \`IDX_result_field_revision_user\` ON \`result_field_revision\``);
        await queryRunner.query(`DROP TABLE \`result_field_revision\``);
        await queryRunner.query(`DROP INDEX \`IDX_ai_review_session_result\` ON \`ai_review_session\``);    
        await queryRunner.query(`DROP TABLE \`ai_review_session\``);
        await queryRunner.query(`DROP INDEX \`IDX_ai_review_event_session\` ON \`ai_review_event\``);
        await queryRunner.query(`DROP INDEX \`IDX_ai_review_event_result\` ON \`ai_review_event\``);
        await queryRunner.query(`DROP INDEX \`IDX_ai_review_event_evt_field\` ON \`ai_review_event\``);
        await queryRunner.query(`DROP TABLE \`ai_review_event\``);
        await queryRunner.query(`DROP INDEX \`IDX_ai_review_proposal_session_field\` ON \`ai_review_proposal\``);
        await queryRunner.query(`DROP TABLE \`ai_review_proposal\``);
    }

}
