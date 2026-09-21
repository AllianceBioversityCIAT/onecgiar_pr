import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `bilateral_quality_assessments` — one row per AI quality-assessment run
 * against a bilateral result.
 *
 * @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-2, design.md §3.1
 * "Entities", §3.2 "Migrations", requirements.md BIL-QAI-R-8)
 *
 * ## Why a table at all
 *
 * `POST /api/bilateral/center/quality-assessment/:resultId` (T-4/T-5) records
 * the traffic-light verdict, per-section results, per-evidence verdicts and
 * the eventual submit decision so a Program reviewer can see, additively, why
 * a bilateral result was marked green/amber/red/grey and whether the centre
 * submitted anyway. Rows are never updated or deleted after they are written
 * — a re-run inserts a new row — so this is append-only audit history, the
 * same shape as `result_review_history`.
 *
 * ## Why these columns and no others
 *
 * - `result_id` — the assessed result, real `FOREIGN KEY` into `result.id`,
 *   indexed on its own (single-column lookups) and again as the leading
 *   column of `(result_id, created_at)` (latest-first reads, `T-6`'s
 *   `findLatestByResultId`).
 * - `version_id` — the reporting phase the result belonged to at run time
 *   (traceability only, per `design.md` §3.1 — deliberately no
 *   `FOREIGN KEY`, unlike `result_id`/`created_by`).
 * - `content_hash` — sha256 hex of the canonical payload sent to the AI, so a
 *   later submit can detect the form changed underneath a stale assessment.
 * - `contract_version` — the AI quality-assessment contract version (`0.1`).
 * - `status` — `running` · `completed` · `unavailable` · `skipped_kp_rule`.
 * - `unavailable_reason` — set only when `status = 'unavailable'`:
 *   `timeout` · `http_error` · `malformed` · `not_configured`.
 * - `overall_verdict`, `overall_score`, `overall_summary`, `sections`,
 *   `evidence`, `criteria_version`, `elapsed_ms` — the AI response, stored
 *   verbatim (`BIL-QAI-R-12`) once `status = 'completed'`.
 * - `decision`, `had_outstanding_flags`, `decided_at` — stamped inside the
 *   submit transaction (`BIL-QAI-DD-7`), not here. `decision = 'adjusted'` is
 *   reserved and never written by anything today (`BIL-QAI-DD-6`): an
 *   undecided row (`decision`/`decided_at` both null) IS the "user made
 *   adjustments instead of submitting" signal.
 * - `created_by` — who triggered the run, real `FOREIGN KEY` into `users.id`.
 * - `created_at` — `DEFAULT CURRENT_TIMESTAMP`, evaluated by MySQL itself
 *   (never a JS `Date`, which mysql2 would serialise in the connection's
 *   local time instead — same reasoning already on file for
 *   `bilateral_handoff_codes.created_at`).
 *
 * No soft-delete, no `is_active`, no `BaseEntity`/`Auditable`: every row is
 * kept forever as traceability that travels with the result (AC-7 spirit) —
 * there is nothing here to "deactivate" the way `ClarisaCenter.is_active`
 * flags an obsolete catalog row.
 *
 * ## The four futures (repo rule 25)
 *   - Applied without the new code: an empty table nobody queries. Inert.
 *   - Code deployed without applying it: the new endpoints would fail to
 *     insert/read and the AI traffic light would not appear — no assessment
 *     until the migration runs. The Jenkins pipeline applies migrations
 *     before the backend serves traffic.
 *   - Applied twice: TypeORM's own `migrations` table prevents a migration
 *     file from being applied twice; a hypothetical re-run of the raw SQL
 *     would fail on the duplicate `PRIMARY KEY`/`FOREIGN KEY` names rather
 *     than being inert.
 *   - Reverted with rows inside: drops the entire assessment audit trail for
 *     every bilateral result. Unlike `bilateral_handoff_codes` (throw-away,
 *     120 s state), this is a real loss — only acceptable pre-launch, before
 *     any centre has run a real assessment.
 *
 * ## Pruning note
 *
 * `npm run migration:generate` diffed 31 unrelated tables of pre-existing
 * drift alongside this one (`ai_review_event`, `ai_review_session`,
 * `bilateral_ai_draft_evidence`, `bilateral_ai_drafts`, `bilateral_ai_jobs`,
 * `clarisa_global_unit_lineage`, `clarisa_global_units`,
 * `clarisa_project_countries`, `clarisa_project_mappings`,
 * `clarisa_projects`, `investment_discontinued_option`, `notifications`,
 * `otp_challenges`, `result`, `result_actors`, `result_country`,
 * `result_country_subnational`, `result_deletion_audit`,
 * `result_field_ai_state`, `result_field_revision`,
 * `result_innovation_merge_split`, `result_ip_eoi_outcomes`, `result_region`,
 * `result_review_history`, `results_by_institution`,
 * `results_innovations_use`, `results_kp_mqap_institutions`,
 * `results_toc_result_indicators`, `template`, `user_notification_settings`,
 * `users`, `webhook_delivery`) — none of it caused by this change. Every one
 * of those statements was removed by hand; only `bilateral_quality_assessments`
 * is kept below, and its column list, index names and constraint names match
 * what `migration:generate` emitted for this table verbatim.
 */
export class BilateralQualityAssessments1789566953005
  implements MigrationInterface
{
  name = 'BilateralQualityAssessments1789566953005';

  private static readonly TABLE = 'bilateral_quality_assessments';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`${BilateralQualityAssessments1789566953005.TABLE}\` (
        \`id\` bigint NOT NULL AUTO_INCREMENT,
        \`result_id\` bigint NOT NULL,
        \`version_id\` bigint NULL,
        \`content_hash\` char(64) NOT NULL,
        \`contract_version\` varchar(16) NOT NULL,
        \`status\` varchar(24) NOT NULL,
        \`unavailable_reason\` varchar(32) NULL,
        \`overall_verdict\` varchar(8) NULL,
        \`overall_score\` tinyint NULL,
        \`overall_summary\` text NULL,
        \`sections\` json NOT NULL,
        \`evidence\` json NOT NULL,
        \`criteria_version\` varchar(64) NULL,
        \`elapsed_ms\` int NULL,
        \`decision\` varchar(32) NULL,
        \`had_outstanding_flags\` tinyint NULL,
        \`decided_at\` datetime NULL,
        \`created_by\` int NOT NULL,
        \`created_at\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX \`IDX_bilateral_quality_assessments_result_id\` (\`result_id\`),
        INDEX \`IDX_bilateral_quality_assessments_result_created\` (\`result_id\`, \`created_at\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    // Constraint names below are exactly what TypeORM's generator derived from the
    // current entity metadata (a content hash, not hand-picked) — kept verbatim so a
    // future `migration:generate` diffs clean against this table instead of proposing
    // a rename.
    await queryRunner.query(`
      ALTER TABLE \`${BilateralQualityAssessments1789566953005.TABLE}\`
        ADD CONSTRAINT \`FK_2a76277debd9bf5cbcc05d7ae03\`
        FOREIGN KEY (\`result_id\`) REFERENCES \`result\`(\`id\`)
        ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE \`${BilateralQualityAssessments1789566953005.TABLE}\`
        ADD CONSTRAINT \`FK_5690f7300f82062337e299a803a\`
        FOREIGN KEY (\`created_by\`) REFERENCES \`users\`(\`id\`)
        ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`${BilateralQualityAssessments1789566953005.TABLE}\` DROP FOREIGN KEY \`FK_5690f7300f82062337e299a803a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`${BilateralQualityAssessments1789566953005.TABLE}\` DROP FOREIGN KEY \`FK_2a76277debd9bf5cbcc05d7ae03\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_bilateral_quality_assessments_result_created\` ON \`${BilateralQualityAssessments1789566953005.TABLE}\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_bilateral_quality_assessments_result_id\` ON \`${BilateralQualityAssessments1789566953005.TABLE}\``,
    );
    await queryRunner.query(
      `DROP TABLE \`${BilateralQualityAssessments1789566953005.TABLE}\``,
    );
  }
}
