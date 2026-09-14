# Execution Log — Bilateral Center Overview Tab

## Document Control

| Field | Value |
|---|---|
| **Spec Path** | `docs/specs/bilateral/center-overview-tab/` |
| **Status** | `in-progress` |
| **Started** | 2026-09-14 |
| **Leader** | AKILI execute session (T1 — Fable 5.1). Registry T1 entry (`opus`) is older than the session model; flagged for default-branch refresh, not edited here |
| **Implementer / Reviewer** | `.claude/agents/akili-implementer.md` (sonnet) / `.claude/agents/akili-reviewer.md` (opus) — author ≠ auditor by wrapper binding |
| **Approval Mode** | `pre-approved` for routine PASS gates (project feedback: pragmatic execution; the spec's `gated` label is not high-risk — additive SQL field, new client page, no migration/auth). HALT, Pivot, budget tripwire and `FATAL_FAIL` still stop for the user |
| **Runtime rules** | ≤ 1 Reviewer round per task (second FAIL escalates) · targeted `npx jest <path>` only · `tsc --noEmit` + `npx ng lint --quiet` per client task · module CT once per template task · plain-language progress line per task boundary |
| **Budget (design §14)** | 8 tasks · ~1,700 LOC · ≤ 8 review rounds |
| **Actuals to date** | 1 task · ~45 LOC · 1 review round |
| **Active rework loop** | `COV-T-2` attempt 1 |
| **Pre-flight (2026-09-14)** | `requirements.md` already `approved` · `design.md` approved · OQ-2/OQ-3 resolved in design §13 · OQ-1 (Jira id) open — commits use `[SPEC:bilateral/center-overview-tab]` · no CLARISA/migration dependency · **Concurrent work still uncommitted in this checkout:** `bilateral/ai-drafts-redesign` (execution `complete`, edits to header/panel/drafts/creator not committed) and `bilateral/manual-create-drawer` (new drawer components, server bilateral DTO/service). Rule applied: `COV-T-6`/`COV-T-7` wait until those land; T-1…T-5 touch disjoint files. `git log --since=7.days -- pages/bilateral`: `a1e2651b1` (projects-panel restyle), `78c3e5e89` (lead project reassignment), `2744820db` (P2-3653 result_type_id/submitter on center list — already reflected in the design) |
| **Kaizen digest** | `docs/specs/kaizen-log.md` does not exist in this checkout; lessons are cited inline in `tasks.md` (`KZ-W12-1`, `KZ-GEO-1`, `KZ-BOR-1/2`, `KZ-EVM-1`) and carried into each brief |

---

## Task Execution History

### `COV-T-1` — Add `project_id` to the center-results query

| Field | Value |
|---|---|
| **Final status** | PASS (attempt 1 of ≤ 2) |
| **Date** | 2026-09-14 |
| **Implementer attempts** | 1 (sonnet, effort low, skill `nestjs-expert`) |
| **Reviewer verdict** | `STATUS: PASS` (opus, checklist mode) |
| **Requirements covered** | `COV-R-16` (scenario + BUT no existing field changed / row count identical), `COV-AC-20` (shape part — live part stays with `COV-T-8`) |
| **Files changed** | `onecgiar-pr-server/src/api/results/result.repository.ts` (+14) · `result.repository.spec.ts` (+30) · `results.controller.ts` (Swagger description, text-only) |
| **Final verification** | `npx jest src/api/results/result.repository.spec.ts --silent` → 1 suite, 39/39 tests passed · `npx eslint "src/api/results/result.repository.ts" "src/api/results/results.controller.ts" --quiet` → clean · `npm run migration:check` → "Total migrations: 474, Executed: 483, Pending: 0. ✅ No pending migrations found." |

**Attempt 1 — Implementer.** Added a second correlated subquery on `results_by_projects` + `clarisa_projects` selecting `cp.id AS project_id`, placed directly after `project_name`, identical join / `WHERE rbp.is_active = 1` / `ORDER BY rbp.is_lead DESC, rbp.id DESC LIMIT 1`. No change to WHERE, params (`[centerId, centerId, versionId]`) or ordering. Comment carries `@akili-spec bilateral/center-overview-tab COV-R-16`. New spec case asserts `) AS project_id`, every prior alias still selected, placeholder count === params length (`KZ-W12-1`), and the lead-project `ORDER BY` string appears exactly twice. Swagger `description` on `GET bilateral-center-results` now names `project_id` (null when no linked project) next to `project_name`. `Not Done / Assumptions: none`.

**Attempt 1 — Reviewer (PASS).** Verified against the live method, not the diff alone: the new subquery is join-for-join identical to `project_name`; selecting `cp.id` through the inner join (not `rbp.project_id`) means a dangling project reference yields `null` for both fields consistently. Row count structurally unchanged (`LIMIT 1` correlated subquery). `results.service.ts` passes rows through unmapped, so the field reaches the client. `bilateral-result-summaries.en.md` correctly untouched (design §4.2). Noted, not as a finding: the test asserts SQL text, and the behavioral gap is already recorded as `COV-T-8`'s live `project_id` ↔ `project_name` spot check.

**Decisions.** (1) Scope includes `results.controller.ts` although the task's expected-files list names two files: the Swagger line is a Definition-of-done item of the same task, so the commit carries three files. (2) Approval mode applied as `pre-approved` (see Document Control) — gate auto-approved (pre-approved mode).

**Issues encountered.** None. A sibling session committed `d32ed78b9` (manual-create-drawer) mid-task; disjoint files, no interference.

