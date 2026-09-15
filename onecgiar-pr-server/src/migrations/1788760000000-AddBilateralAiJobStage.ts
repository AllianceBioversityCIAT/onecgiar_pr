import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `APF-T-1` (M1) — `bilateral-ai/ai-processing-feedback`. Adds the PRMS-controlled `stage`
 * lifecycle and the retry bookkeeping columns to `bilateral_ai_jobs`, plus a STORED generated
 * "queue-entry clock" used by every age-based rule in the spec (the stall sweeper, the
 * `queue_position` count, the client elapsed timer and the 2-minute mail rule).
 *
 * See `docs/specs/bilateral/ai-processing-feedback/design.md` §3.1/§3.2, `requirements.md`
 * glossary "Queue-entry clock" / `APF-R-1`..`APF-R-5`.
 *
 * - `stage` varchar(32) default 'queued' — 8-value vocabulary, longest is `reading_transcribing`
 *   (20 chars).
 * - `stage_updated_date` — set alongside every `stage` write.
 * - `retrying` tinyint(1) default 0 — `APF-DD-3`: a retryable failure keeps the job `PROCESSING`
 *   instead of bouncing through `FAILED`.
 * - `retried_date` — set by `retryJob` ("Try again"); `created_date` stays untouched so the
 *   original upload time remains readable.
 * - `queue_entry_date` — `GENERATED ALWAYS AS (COALESCE(retried_date, created_date)) STORED`, so
 *   it can be indexed. A retried job's queue-entry clock moves to the retry moment; an
 *   un-retried job's clock is its `created_date`.
 * - `IDX_bilateral_ai_jobs_status_started (status, started_date)` — the sweeper's per-attempt
 *   timeout scan (`BILATERAL_AI_ATTEMPT_TIMEOUT_MS`).
 * - `IDX_bilateral_ai_jobs_status_queue_entry (status, queue_entry_date)` — `getJob`'s
 *   `queue_position` count and the sweeper's stall scan (`BILATERAL_AI_QUEUE_STALL_MS`).
 *
 * **Not added here:** the unique index on `bilateral_ai_drafts (job_id, candidate_index)`. Design
 * §5 "Late completion" makes it a backstop for a lookup-first reuse path that does not exist yet
 * (`APF-T-2`); adding the index before that path lands would make it the mechanism instead of the
 * backstop. `candidate_index` itself already exists on `bilateral_ai_drafts` (added by
 * `1784921546787-CreateBilateralAiTables`) — this migration does not touch that table.
 */
export class AddBilateralAiJobStage1788760000000
  implements MigrationInterface
{
  name = 'AddBilateralAiJobStage1788760000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`bilateral_ai_jobs\`
        ADD COLUMN \`stage\` varchar(32) NOT NULL DEFAULT 'queued' AFTER \`error_message\`,
        ADD COLUMN \`stage_updated_date\` timestamp NULL AFTER \`stage\`,
        ADD COLUMN \`retrying\` tinyint NOT NULL DEFAULT 0 AFTER \`stage_updated_date\`,
        ADD COLUMN \`retried_date\` timestamp NULL AFTER \`retrying\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`bilateral_ai_jobs\`
        ADD COLUMN \`queue_entry_date\` datetime
          GENERATED ALWAYS AS (COALESCE(\`retried_date\`, \`created_date\`)) STORED
          AFTER \`last_updated_date\`
    `);

    await queryRunner.query(`
      CREATE INDEX \`IDX_bilateral_ai_jobs_status_started\`
        ON \`bilateral_ai_jobs\` (\`status\`, \`started_date\`)
    `);

    await queryRunner.query(`
      CREATE INDEX \`IDX_bilateral_ai_jobs_status_queue_entry\`
        ON \`bilateral_ai_jobs\` (\`status\`, \`queue_entry_date\`)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Indexes first (the queue-entry index depends on the generated column), then the generated
    // column, then the plain columns.
    await queryRunner.query(`
      DROP INDEX \`IDX_bilateral_ai_jobs_status_queue_entry\` ON \`bilateral_ai_jobs\`
    `);

    await queryRunner.query(`
      DROP INDEX \`IDX_bilateral_ai_jobs_status_started\` ON \`bilateral_ai_jobs\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`bilateral_ai_jobs\` DROP COLUMN \`queue_entry_date\`
    `);

    await queryRunner.query(`
      ALTER TABLE \`bilateral_ai_jobs\`
        DROP COLUMN \`retried_date\`,
        DROP COLUMN \`retrying\`,
        DROP COLUMN \`stage_updated_date\`,
        DROP COLUMN \`stage\`
    `);
  }
}
