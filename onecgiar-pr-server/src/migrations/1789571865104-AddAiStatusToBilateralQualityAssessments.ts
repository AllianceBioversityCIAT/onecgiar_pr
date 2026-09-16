import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `bilateral_quality_assessments` — adds the two v0.2 columns for the AI's
 * own traffic-light contract: `ai_status` and `degraded_reason`.
 *
 * @akili-spec bilateral/qa-ai-traffic-light (BIL-QAI-T-2b, design.md §3.1
 * "Entities" / §3.2 "Migrations", requirements.md BIL-QAI-R-7 scenarios
 * "The AI answers `partial`" / "The AI answers `unavailable`", BIL-QAI-R-8)
 *
 * ## Why a second migration instead of editing `T-2`'s
 *
 * `1789566953005-BilateralQualityAssessments.ts` (`T-2`) is already
 * generated and queued for the owner's `migration:run` — it was applied to
 * the dev DB on 2026-09-16. Rewriting a migration that may already have run
 * in an environment is how environments diverge: a dev DB that already ran
 * the old `up` would never see the rewritten columns, while a fresh
 * environment running the edited file would get a table shape no other
 * environment's migration history agrees with. A second additive migration
 * keeps every environment's history linear regardless of when each one
 * applies `T-2`.
 *
 * ## Why these two columns and nothing else
 *
 * - `ai_status` varchar(16) NULL — the AI's own `status` verbatim,
 *   `completed` | `partial`. `null` for KP rows (`skipped_kp_rule`), for
 *   `unavailable` rows that never got a usable answer, and for every
 *   pre-v0.2 row.
 * - `degraded_reason` varchar(255) NULL — the AI's plain-language sentence
 *   for a `partial` or `unavailable` run, truncated to 255 on write; the
 *   client sanitises it before persisting so it never carries a host, URL or
 *   response body (NFR *Privacy / secrets*, `BIL-QAI-AC-9`).
 *
 * `unavailable_reason` gains the `ai_unavailable` value (an AI that answered
 * well-formed with `status: "unavailable"`) but needs **no DDL**: the column
 * is already `varchar(32)` and the value set is enforced in application code
 * only (`bilateral-quality-assessment.entity.ts`
 * `BilateralQualityAssessmentUnavailableReason`).
 *
 * ## The four futures (repo rule 25)
 *   - Applied without the new code: two inert nullable columns, always null.
 *   - Code deployed without applying it: inserts/reads of `ai_status` /
 *     `degraded_reason` would fail against the missing columns — no v0.2
 *     traffic light until the migration runs.
 *   - Applied twice: TypeORM's `migrations` table prevents a re-run; a
 *     hypothetical raw re-run would fail on `Duplicate column name`.
 *   - Reverted with rows inside: drops only the two v0.2 columns and their
 *     data. Pre-v0.2 columns and the audit trail `T-2` protects are
 *     untouched.
 *
 * ## Pruning note
 *
 * `npm run migration:generate` diffed pre-existing drift on 29 unrelated
 * tables alongside this one (`ai_review_event`, `ai_review_session`,
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
 * is kept below, and its two `ADD COLUMN` statements match what
 * `migration:generate` emitted verbatim.
 */
export class AddAiStatusToBilateralQualityAssessments1789571865104
  implements MigrationInterface
{
  name = 'AddAiStatusToBilateralQualityAssessments1789571865104';

  private static readonly TABLE = 'bilateral_quality_assessments';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`${AddAiStatusToBilateralQualityAssessments1789571865104.TABLE}\` ADD \`ai_status\` varchar(16) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`${AddAiStatusToBilateralQualityAssessments1789571865104.TABLE}\` ADD \`degraded_reason\` varchar(255) NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`${AddAiStatusToBilateralQualityAssessments1789571865104.TABLE}\` DROP COLUMN \`degraded_reason\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`${AddAiStatusToBilateralQualityAssessments1789571865104.TABLE}\` DROP COLUMN \`ai_status\``,
    );
  }
}
