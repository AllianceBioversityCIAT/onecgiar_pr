# Execution Log — `bilateral/ai-processing-feedback`

## Document Control

| Field | Value |
|---|---|
| **Spec path** | `docs/specs/bilateral/ai-processing-feedback/` |
| **Leader** | AKILI execute — session model Fable 5.1 (T1; registry says `opus`, session model is the newer generation → pass, registry refresh pending) |
| **Implementer / Reviewer** | `.claude/agents/akili-implementer.md` (sonnet, T2) / `.claude/agents/akili-reviewer.md` (opus, T3) — author ≠ auditor by wrapper binding; rotations recorded per task |
| **Approval Mode** | `pre-approved` for this run — applied per the user's standing feedback (pragmatic AKILI execution: pre-approved by default, ≤ 1 Reviewer round per task, targeted jest). Spec header says `gated`; HALT / Pivot / budget tripwire / FATAL_FAIL still stop for the user |
| **Budget (design §14)** | 10 tasks · ~5,000 LOC · ≤ 1 review round per task |
| **Started** | 2026-09-15 10:38 (America/Bogota) |
| **Branch** | `qa-development-2026` (shared worktree — explicit-path commits only) |
| **Pre-flight** | `judgment.md` approved (fix-only) · `APF-OQ-6` resolved · migrations serialized in T-1 · **uncommitted edits by another session in `pages/bilateral/pages/my-draft-results/*` at start → `APF-T-8` paused until they land** (tasks.md §2 shared-worktree rule) · `.codegraph/` present |

## Task Execution History

### `APF-T-1` — Schema + data migrations, entity fields, config constants — **PASS** (attempt 1)

| Field | Value |
|---|---|
| **Date** | 2026-09-15 (10:40 → 10:55, America/Bogota) |
| **Implementer** | `akili-implementer` (sonnet) · skills `nestjs-expert` · effort high (migrations are correctness-critical) |
| **Reviewer** | `akili-reviewer` (opus) · single reviewer with reliability/risk lens emphasis — *deviation*: the command's "parallel lens reviewers" mode for migration tasks was collapsed to one reviewer per the user's ≤ 1-round pragmatic rule; recorded here |
| **Attempts** | 1 |

**Files changed (8, +719):** `onecgiar-pr-server/src/migrations/1788760000000-AddBilateralAiJobStage.ts` (M1), `1788761000000-AddBilateralAiJobFinishedNotificationType.ts` (M2), `1788762000000-AddBilateralAiTerminalEmailTemplates.ts` (M3), `src/api/bilateral-ai/entities/bilateral-ai-job.entity.ts`, `src/api/notification/enum/notification.enum.ts`, `src/shared/microservices/email-notification-management/enum/email-notification.enum.ts`, `src/api/bilateral-ai/bilateral-ai.config.ts` (new), `bilateral-ai.config.spec.ts` (new).

**Leader decisions before spawn:** (1) unique index on `bilateral_ai_drafts (job_id, candidate_index)` **not added** — design §5 allows it only once T-2's lookup-first path exists; `candidate_index` column confirmed present since `1784921546787-CreateBilateralAiTables`. Forward pointer → T-2 / archive: decide whether a backstop migration is wanted. (2) `down` order indexes → generated column → plain columns. (3) No `migration:run`/`revert` against the configured non-local shared dev DB. (4) Consumer `maxRetries` rewiring stays in T-2.

**Implementer verification:** `npx jest src/api/bilateral-ai/bilateral-ai.config.spec.ts --silent` → `Tests: 10 passed, 10 total` · `npx eslint "src/api/bilateral-ai/**/*.ts" --quiet` → exit 0 · `tsc --noEmit` clean · `npm run migration:check` → exit 1 with the 3 new migrations **Pending** — expected under decision 3 (the script compares class names against the `migrations` table, never the schema; Reviewer confirmed). `src/migrations` is eslint-ignored project-wide, so the task's migration lint glob does not run.

**Implementer `Not Done / Assumptions` (verbatim):** "Copy for the two new mail templates (no-candidates, failed) and the late-arrival note is my own wording, following the existing results-ready template's tone/markup exactly (same HTML shell, `created_by: 977`). Product hasn't supplied final copy for these (unlike the results-ready template); flag for a copy pass before ship if that matters." / "`migration:check` cannot go green without `migration:run`, which decision 3 explicitly blocks here." — Leader ruling: neither is scope owed by this task (copy intent, not copy, is what `APF-R-4` specifies; the live migration proof is `APF-T-10`'s `DESCRIBE`). Copy sign-off goes to the T-10 HITL table alongside `APF-OQ-2`.

**Notable finding:** `email_template_bilateral_ai_results_ready` had no seed migration (inserted out of band, id 24). M3 snapshots the current body from the dev DB so `down` restores it byte-for-byte; `up`/`down` guarded on the `{{#if late}}` marker.

**Template variables (T-3 binds to these):** RESULTS_READY: `user_name, center_acronym, result_count, result_plural, drafts_url, late` · NO_CANDIDATES: `user_name, center_acronym, source_plural, source_mix, duration_minutes, create_url` · FAILED: `user_name, center_acronym, error_cause, retry_url`.

**Reviewer verdict — `STATUS: PASS`:** "All four column specs, the STORED generated expression, both index names, the `down` ordering, the M2/M3 guards, the enum names and the three config defaults match `design.md` §3.1/§3.2/§5 and the `APF-T-1` entry in `tasks.md`. The diff touches exactly the eight declared files, no other service, no `console.log`, and no secret." Independently confirmed: `retrying tinyint` + entity `boolean` matches the module's existing `is_discarded` idiom; `INSERT … SELECT … WHERE NOT EXISTS` form already proven in this DB; AC-9 holds. **Recorded gap:** reversibility unproven (no `down` executed) → owned by `APF-T-10`.

**ADVISORY (4R, recorded, no rework):**
- *Risk* — M3 overwrites the results-ready body with a snapshot from one shared dev DB and `down` restores that snapshot; in an environment whose body differs (PROD copy edited out of band), `up` silently replaces it and `down` installs a foreign body. Suggested: body-agnostic `REPLACE` injecting/removing the `{{#if late}}` block. **Decide before PR 1 reaches production.**
- *Reliability* — config getters use `Number(env.X || DEFAULT)`: `'0'` falls back to default, non-numeric yields `NaN`; once T-2's consumer reads the ceiling, `attempts < NaN` is false → first failure becomes terminal with no warning. House-wide idiom (same in `bilateral-ai-text-mining.service.ts`). Not folded into T-2 (advisory never widens a task); candidate for a follow-up proposal.
- *Risk* — adding a STORED generated column forces a full table rebuild (`ALGORITHM=COPY`); harmless at current `bilateral_ai_jobs` size, worth knowing at deploy time. (Report truncated at this point; remainder not retrieved.)

**Requirements covered:** data prerequisites of `APF-R-1`, `R-2`, `R-3`, `R-4`, `R-5`; no scenario closes here. **Gate:** auto-approved (pre-approved mode).

