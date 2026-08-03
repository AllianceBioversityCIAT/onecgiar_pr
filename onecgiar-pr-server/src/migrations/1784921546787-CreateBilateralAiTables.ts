import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBilateralAiTables1784921546787
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`bilateral_ai_jobs\` (
        \`job_id\` varchar(36) NOT NULL,
        \`user_id\` int NOT NULL,
        \`center_id\` int NULL,
        \`project_id\` int NOT NULL,
        \`program_code\` varchar(100) NOT NULL,
        \`bucket_name\` varchar(255) NOT NULL,
        \`document_keys\` json NULL,
        \`audio_keys\` json NULL,
        \`text_context\` text NULL,
        \`status\` varchar(20) NOT NULL DEFAULT 'PENDING',
        \`attempts\` int NOT NULL DEFAULT 0,
        \`external_interaction_id\` varchar(120) NULL,
        \`response_snapshot\` json NULL,
        \`result_count\` int NOT NULL DEFAULT 0,
        \`error_code\` varchar(50) NULL,
        \`error_message\` text NULL,
        \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`started_date\` timestamp NULL,
        \`completed_date\` timestamp NULL,
        \`last_updated_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`job_id\`),
        INDEX \`IDX_bilateral_ai_jobs_user_status\` (\`user_id\`, \`status\`),
        INDEX \`IDX_bilateral_ai_jobs_project\` (\`project_id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`bilateral_ai_drafts\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`job_id\` varchar(36) NOT NULL,
        \`result_id\` bigint NOT NULL,
        \`candidate_index\` int NOT NULL,
        \`extracted_mds\` json NULL,
        \`candidate_snapshot\` json NULL,
        \`mapping_warnings\` json NULL,
        \`is_discarded\` tinyint NOT NULL DEFAULT 0,
        \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`last_updated_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        UNIQUE INDEX \`IDX_bilateral_ai_drafts_result\` (\`result_id\`),
        INDEX \`IDX_bilateral_ai_drafts_job\` (\`job_id\`),
        CONSTRAINT \`FK_bilateral_ai_drafts_job\` FOREIGN KEY (\`job_id\`) REFERENCES \`bilateral_ai_jobs\` (\`job_id\`) ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT \`FK_bilateral_ai_drafts_result\` FOREIGN KEY (\`result_id\`) REFERENCES \`result\` (\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      CREATE TABLE \`bilateral_ai_draft_evidence\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`draft_id\` bigint NOT NULL,
        \`source_type\` varchar(20) NOT NULL,
        \`object_key\` text NULL,
        \`file_name\` varchar(255) NULL,
        \`mime_type\` varchar(120) NULL,
        \`file_size\` bigint NULL,
        \`is_formal_evidence\` tinyint NOT NULL DEFAULT 0,
        \`file_management_reference\` text NULL,
        \`is_active\` tinyint NOT NULL DEFAULT 1,
        \`created_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`last_updated_date\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        INDEX \`IDX_bilateral_ai_draft_evidence_draft\` (\`draft_id\`),
        CONSTRAINT \`FK_bilateral_ai_draft_evidence_draft\` FOREIGN KEY (\`draft_id\`) REFERENCES \`bilateral_ai_drafts\` (\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
      ) ENGINE=InnoDB
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `bilateral_ai_draft_evidence`');
    await queryRunner.query('DROP TABLE `bilateral_ai_drafts`');
    await queryRunner.query('DROP TABLE `bilateral_ai_jobs`');
  }
}
