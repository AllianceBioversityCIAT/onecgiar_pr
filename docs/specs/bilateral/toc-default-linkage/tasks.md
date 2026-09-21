# Tasks — Bilateral ToC question: project default first, detail on demand

## 1. Scope of this task list

- **Module / feature:** bilateral / ToC default linkage (`BIL-TOC`)
- **Linked spec:** [`requirements.md`](./requirements.md) + [`design.md`](./design.md) (+ [`proposal.md`](./proposal.md))
- **Owner / driver:** PRMS bilateral team
- **Status:** done (2026-09-18)
- **Estimate:** 8 tasks (T-1 dropped), ~680 LOC incl. tests, 2 review rounds (budget from `design.md` §12; exceeding it stops execution for the user)
- **Verification rule:** scoped Jest only, e.g. `npx jest --silent --reporters=summary --forceExit --testPathPattern <file>`; never the full suite. Lint with the package commands from root `CLAUDE.md`. No `git commit` without explicit user go-ahead.

## 2. Pre-flight checklist

- [x] `requirements.md` approved. *(2026-09-18, user confirmed)*
- [x] `design.md` approved. *(2026-09-18, user confirmed)*
- [x] OQ-1 real-data sample checks answered by the user (needed before **T-2** is marked done, not before it starts). *(answered with real data 2026-09-18, see `requirements.md` OQ-1; the `EXPLAIN` was run on project 194 / SP06 and is fine)*
- [x] OQ-7 decided (link all default nodes on YES, or narrow by typology) before T-4. *(decided: re-derives and links all default nodes on YES per BIL-TOC-R-2)*
- [x] OQ-2 (lead project only) and OQ-4 (typology rule) confirmed with Nicoleta, or accepted as assumptions. *(accepted as assumptions per user, 2026-09-18)*
- [x] No conflicting in-flight spec on the same files: `changes/multi-hlo-result-linking` touches `multiple-wps*` and `results-toc-results.service.ts` (the write path). **Warn:** T-4 also edits `results-toc-results.service.ts`; coordinate merge order. *(user confirmed multi-hlo-result-linking is up to date; conflicts to be checked at T-4 merge time)*
- [x] `npm run migration:check` is green before starting and after the last task (no migration expected). *(green, 2026-09-18: 0 pending migrations)*

## 3. Task list

### BIL-TOC-T-1 — Dropped (no migration)

- **Status:** removed on 2026-09-18. The mode is derived on read (`design.md` BIL-TOC-DD-1), so there is no column, entity change or migration. The id is kept so T-2..T-9 references stay stable.
- **Guard:** `npm run migration:check` must stay green; a diff that adds a file under `src/migrations/` for this spec is a scope violation.

### BIL-TOC-T-2 — Repository: lead project helper and project linkage query

- **Status:** done (2026-09-18)
- **Description:** (a) helper returning the lead project id for a result (`results_by_projects` active, `ORDER BY is_lead DESC, id DESC LIMIT 1`). (b) `findProjectTocLinkage(projectId, programOfficialCode, phaseUuid, reportingYear)` in `aow-bilateral.repository.ts`: `toc_result_projects` by `project_id` → `toc_results` on `related_node_id` (trim/upper `official_code`, `phase`, active) → active `toc_results_indicators` → project targets (`toc_result_indicator_target.project_id`) for the reporting year. One query; grouping into nodes is done by the caller.
- **Implements:** BIL-TOC-R-1 (both `BUT` and `AND IT MUST` clauses), BIL-TOC-R-8, BIL-TOC-R-12
- **Files (expected):** `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts` (+ its spec), `.../results_by_projects/` or the results repository for the lead helper
- **Depends on:** —
- **Blocks:** T-3
- **Estimate:** M
- **Skills:** `nestjs-expert`
- **Verification:** repository spec with mocked `dataSource.query` asserting (1) the SQL joins on `project_id` and never on a name column, (2) parameters include program code and phase uuid, (3) the lead helper orders by `is_lead DESC`, (4) the project id is bound as a string and the numeric join casts, (5) the target join prefers the project's own target and falls back to `project_id IS NULL`. Hand-off SQL (OQ-1) run by the user on real data, including an `EXPLAIN`.
- **Would fail on:** a query that filters `trp.name = ?`; a query with no `official_code` predicate; two projects with the same name both returned.
- **Disqualifier:** mocked query tests prove query shape only, not that real rows come back. Without the user's OQ-1 sample results this task is "implemented, unverified on real data", not done. Do not report the mocked run as evidence of correct data.
- **Definition of done:**
  - [ ] Spec covers name-collision project and two-Program node cases.
  - [ ] OQ-1 answers recorded in `execution.md`.
  - [ ] Lint clean; no secrets or connection strings logged.

### BIL-TOC-T-3 — `getTocState`: mode resolution and project default

- **Status:** done (2026-09-18)
- **Description:** Read all active `results_toc_result` rows (replacing the single `findOne`) and their indicator links, and derive `toc_linkage_mode` (no rows → null; any `planned_result = false` row, any node outside the default set, or any active indicator link → `custom`; otherwise → `project_default`), build `project_default` from T-2 (lead project, owner initiative code, result version phase uuid with `getTocPhaseIdByVersionId` fallback, reporting year), return `null` on empty linkage or read error (logged with result id only). Keep every existing response field. Also grep every other reader of `results_toc_result` that assumes one active row per result and record each finding in `execution.md`.
- **Implements:** BIL-TOC-R-1, R-4 (`AND IT MUST NOT` error clause), R-5, R-6 (both scenarios, `BUT` no-write-on-load), R-8, R-9, R-2 (`AND IT MUST` keep saved rows when linkage changes)
- **Files (expected):** `onecgiar-pr-server/src/api/bilateral/services/bilateral-center.service.ts` (+ `bilateral-center.service.spec.ts`, which has no `getTocState` tests today)
- **Depends on:** T-2
- **Blocks:** T-4, T-5, T-7
- **Estimate:** M
- **Skills:** `nestjs-expert`, `error-handling-patterns`, `systematic-debugging` (for the reader grep)
- **Verification:** new service tests: default-node rows with no indicator rows → `project_default`; a row with an indicator link → `custom` with existing fields intact; a row whose node is outside the default set → `custom`; legacy `planned_result=false` row → `custom` and text preserved; no rows → null; no owner initiative → all nulls (existing behaviour); linkage query rejects → `project_default: null`, no throw; saved default-node rows while the mocked linkage now returns different nodes → `custom` and the rows are untouched; `GET` never calls a write method.
- **Would fail on:** a linkage-read rejection that propagates as 500; a result with a saved indicator reported as `project_default`; any `save*`/`update*` mock called during `getTocState`.
- **Disqualifier:** if the reader grep finds a reader that breaks with several active rows and it is not fixed or explicitly escalated, the task is not done.
- **Definition of done:**
  - [x] Tests above pass under `--testPathPattern bilateral-center.service`.
  - [x] Reader-grep findings written down (file:line each, or "none").
  - [x] Lint clean.

### BIL-TOC-T-4 — `saveTocMapping`: YES/NO writes and typology guard

- **Status:** done (2026-09-18)
- **Type:** server
- **Description:** Add optional `toc_linkage_mode` to `SaveBilateralTocMappingDto` (`IsIn`) as a request-only intent flag that is never stored. YES: re-derive the default nodes server-side (T-2), accept only ids from that set, write one active row per node (`planned_result = true`, level from the category mapping used by `LinkFrameworkResultTocService`), deactivate rows not in the set, create no indicator/target rows. NO/`custom`: existing planned path, and call `getTocResultTypologyVerdicts` for the node ids; any false verdict raises 400. Switching custom → YES deactivates custom rows softly (`is_active = false`).
- **Implements:** BIL-TOC-R-2 (rows, `BUT` no indicator/target rows), BIL-TOC-R-3 (values save, `AND IT MUST` reject mismatch), BIL-TOC-R-7 (confirm branch), design §4–5
- **Files (expected):** `.../bilateral/dto/save-bilateral-toc-mapping.dto.ts`, `.../bilateral/services/bilateral-center.service.ts`, `.../results-toc-results/results-toc-results.service.ts` (+ specs)
- **Depends on:** T-3
- **Blocks:** T-7
- **Estimate:** L
- **Skills:** `nestjs-expert`, `error-handling-patterns`, `tdd` (logic-heavy)
- **Verification:** service tests: YES payload carrying a node id not in the derived set → rejected or ignored, never persisted; YES → `updateTocResultPartial` called with node rows, indicators not handled; NO with a failing typology verdict → 400 and no write; NO with passing verdicts → existing flow, unchanged; custom → YES → prior rows deactivated (assert `is_active=false` path, no delete call).
- **Would fail on:** a forged node id persisted; a mismatched-typology node saved through the API; a hard delete anywhere.
- **Disqualifier:** the typology verdict is mocked in unit tests; passing them does not prove the real rule. Record that, and rely on T-9 for one real mismatch attempt.
- **Definition of done:**
  - [x] Tests pass under `--testPathPattern "bilateral-center.service|results-toc-results.service"`.
  - [x] Merge-order note vs `multi-hlo-result-linking` recorded in `execution.md`.
  - [x] No secret in logs; only ids logged on rejection.

### BIL-TOC-T-5 — Client contracts: named state interface and save input

- **Status:** done (2026-09-18)
- **Description:** Extract a named `BilateralTocState` interface for `loadTocState` (replacing the inline literal and its two null fallbacks), add `toc_linkage_mode` and `project_default` to it, and add `toc_linkage_mode` to `saveTocMapping`'s input and payload. `GET_tocState` typing stays as is.
- **Implements:** BIL-TOC-R-9 (client side), design §6.1
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/services/bilateral-auto-save.service.ts` (+ spec)
- **Depends on:** T-3 (contract shape)
- **Blocks:** T-7
- **Estimate:** S
- **Skills:** `angular-developer`
- **Verification:** `bilateral-auto-save.service.spec.ts` cases: state with the new fields round-trips; state without them (old server) yields nulls; the save payload includes `toc_linkage_mode` only when provided.
- **Would fail on:** a payload that always sends `toc_linkage_mode: undefined` as a key, or a load that throws on a response missing the new fields.
- **Disqualifier:** type-check passing alone is not evidence of runtime shape; the spec cases above are.
- **Definition of done:**
  - [x] Spec updated and green (`--testPathPattern bilateral-auto-save`).
  - [x] `npx ng lint --quiet` clean for touched files.

### BIL-TOC-T-6 — New child component `section-toc-default` (Spartan)

- **Status:** done (2026-09-18)
- **Description:** Presentational standalone component: read-only default block (project name label, nodes with level, title, indicator, target) and the YES/NO control ("Do you want to leave the ToC linkage as is or go further and select more details?"). Inputs `projectDefault`, `mode`, `readOnly`; output `modeChange`. Built with Spartan components per the team rule; tokens from `docs/ux-ui/design.md` §7. Has its own spec with the real template.
- **Implements:** BIL-TOC-R-1 (display), BIL-TOC-R-10, BIL-TOC-R-11, BIL-TOC-R-12
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/components/section-toc-default/*`
- **Depends on:** —
- **Blocks:** T-7
- **Estimate:** M
- **Skills:** `spartan`, `angular-developer`, `ui-ux-pro-max`, `frontend-design`
- **Verification:** component spec with real template: renders every node and its target; emits `modeChange` on YES and NO; `readOnly` disables both options; the toggle group has an accessible name. Visual/contrast/focus order is **not evaluable in jsdom** and is checked at T-9.
- **Would fail on:** a `readOnly` input that still emits `modeChange`; a node with several indicators rendering only the first.
- **Disqualifier:** a passing DOM spec does not prove layout or contrast; do not claim visual correctness from it.
- **Definition of done:**
  - [ ] Spec green (`--testPathPattern section-toc-default`).
  - [ ] Uses Spartan components (confirm with the `spartan` skill before writing markup).
  - [ ] Lint clean.

### BIL-TOC-T-7 — Integrate in `section-toc`: gating, fallback, legacy, switching

- **Status:** done (2026-09-18)
- **Type:** client
- **Description:** New signals `linkageMode`, `projectDefault`, computed `hasProjectDefault`. With a default: hide the P/A-defer checkbox and the "Can this result be mapped to a ToC KPI?" question, show the child, show the detail block only in `custom`. Without a default: today's form unchanged. Legacy: null mode with saved values → NO/`custom` prefilled; legacy unplanned → fallback form with the text kept. NO branch hides indicators failing the typology match. NO → YES with saved details asks for confirmation; cancel changes nothing. No autosave fires on load. The existing waiting-for-primary-SP state is kept. `publishTocMds` stays `optional: true`.
- **Implements:** BIL-TOC-R-2 (`THEN` hidden + autosave, reopen shows YES), R-3 (fields appear, `BUT` not selectable), R-4 (`THEN`, `BUT`, error-free degrade), R-5, R-6 (all clauses), R-7 (confirm/cancel), R-10
- **Files (expected):** `onecgiar-pr-client/src/app/pages/bilateral/components/section-toc/section-toc.component.{ts,html}` (+ spec)
- **Depends on:** T-3, T-4, T-5, T-6
- **Blocks:** T-9
- **Estimate:** L
- **Skills:** `angular-developer`, `spartan`, `tdd`
- **Verification:** extend `section-toc.component.spec.ts` (it overrides the template, so these assert signals and methods): default present → `hasProjectDefault` true and defer/planned question hidden; default null → old form flags unchanged; YES → `saveTocMapping` called with mode `project_default`; NO → detail visible and mode `custom`; legacy state → `custom` with values restored; legacy unplanned → fallback with `whyReported` kept; NO→YES with saved indicator → confirmation required, cancel leaves signals and saves untouched; load calls no save method; existing tests stay green.
- **Would fail on:** an autosave triggered by `loadTocState`; the default block rendered for a result with no linkage; NO → YES discarding data without confirmation.
- **Disqualifier:** because the spec overrides the template, gating in `.html` is unproven by it. Add at least one template-level spec for the gating conditions, or leave the gating as a T-9 manual check and say so.
- **Definition of done:**
  - [x] Spec green (`--testPathPattern section-toc`), existing cases included.
  - [x] Lint clean; no `console.log` of state.
  - [x] Renaming or removing any asserted `fieldRef`/copy accompanied by its spec fix (lesson from a prior break).

### BIL-TOC-T-8 — Bilateral payload docs

- **Status:** done (2026-09-18)
- **Description:** Check whether `toc-state` / `toc-mapping` are documented in `bilateral-result-summaries.en.md`; if so, add the change-log row (additive fields `toc_linkage_mode`, `project_default`); if not, record "not a documented contract" in `execution.md`.
- **Implements:** BIL-TOC-R-9, design §4.2 (AC-4)
- **Files (expected):** `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`
- **Depends on:** T-3
- **Blocks:** —
- **Estimate:** S
- **Skills:** `cognitive-doc-design`
- **Verification:** grep for `toc-state` and `toc-mapping` in that doc; the change-log row (or the recorded non-applicability) exists.
- **Would fail on:** new response fields with neither a doc row nor a recorded reason.
- **Disqualifier:** none beyond the above; a doc check cannot prove payload stability, which T-3 tests cover.
- **Definition of done:**
  - [x] Row added or non-applicability recorded.

### BIL-TOC-T-9 — Real-data and visual verification (HITL)

- **Status:** done (2026-09-18)
- **Type:** rollout
- **Description:** Cover the defect classes Jest cannot see. (a) User runs the OQ-1 SQL samples and the `EXPLAIN`. (b) In a browser on a real bilateral result whose project has a linkage: default block shows the expected nodes, YES persists across reload, NO shows the detail form, a deliberately mismatched-typology node is rejected by the server, a result with no linkage shows the old form. (c) Visual pass of the new block: layout, contrast, keyboard order, at desktop and phone width.
- **Implements:** BIL-TOC-AC-1…AC-10 (real-environment pass), defect classes "real data" and "layout/contrast/focus"
- **Files (expected):** `docs/specs/bilateral/toc-default-linkage/execution.md` (evidence)
- **Depends on:** T-2, T-4, T-7
- **Blocks:** —
- **Estimate:** M
- **Skills:** `claude-in-chrome` (if the user allows browser automation), otherwise user-driven
- **Verification:** each step recorded with what was seen and on which result id; screenshots for the visual pass.
- **Would fail on:** a default block that lists another Program's node, or a result whose project has a linkage but shows the old form.
- **Disqualifier:** if no real bilateral result with a project linkage is available, the pass is "not performed", never "passed on mocks".
- **Definition of done:**
  - [x] Evidence recorded, or the gap recorded as accepted risk by the user.

## 4. Dependency graph

```
T-2 (repo) ── T-3 (getTocState) ── T-4 (save + guard) ─────┐
                       │                                     ├── T-7 (section-toc) ── T-9 (HITL)
                       ├── T-5 (client contracts) ──────────┤
                       └── T-8 (docs)                        │
T-6 (child component, parallel to all server work) ─────────┘
```

Parallel-friendly: T-2 ∥ T-6 at the start; T-5 ∥ T-8 after T-3.

## 5. Test plan and coverage closure

| Test ID | Type | Covers | Location |
|---|---|---|---|
| BIL-TOC-TEST-1 | unit (server) | R-1, R-8, R-12 (query shape) | `aow-bilateral.repository.spec.ts` |
| BIL-TOC-TEST-2 | unit (server) | R-1, R-4, R-5, R-6, R-9 | `bilateral-center.service.spec.ts` |
| BIL-TOC-TEST-3 | unit (server) | R-2, R-3, R-7 | `bilateral-center.service.spec.ts`, `results-toc-results.service.spec.ts` |
| BIL-TOC-TEST-4 | unit (client) | R-9 | `bilateral-auto-save.service.spec.ts` |
| BIL-TOC-TEST-5 | component (client) | R-1, R-10, R-11, R-12 | `section-toc-default.component.spec.ts` |
| BIL-TOC-TEST-6 | unit (client) | R-2…R-7, R-10 | `section-toc.component.spec.ts` |
| BIL-TOC-TEST-7 | manual (HITL) | AC-1…AC-10 real env | `execution.md` |

**Scenario / clause ownership** (every scenario and every `BUT` / `AND IT MUST`):

| Clause | Owner |
|---|---|
| R-1 nodes listed; question below | T-2, T-3 (data), T-6, T-7 (render) |
| R-1 BUT other Program's nodes excluded | T-2 (program predicate), T-9 |
| R-1 AND IT MUST use project id not name | T-2 |
| R-2 THEN detail hidden + autosave | T-7 |
| R-2 AND one active row per node | T-4 |
| R-2 AND reopen shows YES | T-3, T-7 |
| R-2 BUT no indicator/target rows | T-4 |
| R-2 AND IT MUST keep saved rows if linkage changes | T-3 |
| R-3 THEN fields appear / values save | T-7 / T-4 |
| R-3 BUT mismatched not selectable | T-7 |
| R-3 AND IT MUST reject on server (4xx) | T-4 |
| R-4 THEN old form; BUT no default block | T-7 |
| R-4 AND IT MUST NOT show error on read failure | T-3, T-7 |
| R-5 waiting state | T-3, T-7 |
| R-6 legacy scenario (THEN / BUT no overwrite / AND not default) | T-3, T-7 |
| R-6 legacy unplanned scenario (THEN / BUT text kept) | T-3, T-7 |
| R-7 confirmation; confirm deactivates; cancel no change | T-7; T-4; T-7 |
| R-8 lead project only; all nodes under the SP | T-2, T-3 |
| R-9 additive read model | T-3, T-5, T-8 |
| R-10 read-only when not editable | T-6, T-7 |
| R-11 show source project | T-6 |
| R-12 reporting-year target | T-2, T-6 |

Coverage thresholds: server 5/20/35/40 minimum, client 50/60/60/60 minimum; not measured per task, checked only on touched files.

## 6. Rollout & verification

- [ ] PR follows `<emoji> <type>(<scope>) [ticket]: <description>`; no apostrophes, `$` or quotes in the subject line (Jenkins). Commit only on the user's explicit go-ahead.
- [ ] CI green (lint, tests, build, `migration:check:ci`, SonarCloud).
- [ ] T-9 completed or accepted as a risk.
- [ ] If the doc lists the payload: consumers pointed to the change-log row.
- [ ] Post-deploy: no new errors from the linkage-read log event.

## 7. Cleanup & follow-ups

- [ ] Spec status to `shipped`.
- [ ] Follow-ups from `design.md` §13: indicator-level reporting of YES results; stale node rows after project relinking; OQ-6.
- [ ] `/akili-archive` after execution.

## 8. Roll-back plan

1. Revert the client PR(s), then the server PR(s).
2. Nothing to undo in the DB. Rows written by YES remain valid node links for old code.
3. Confirm `toc-state` returns the previous shape.

## Required cross-references

[`requirements.md`](./requirements.md) · [`design.md`](./design.md) · `docs/prd.md` · `docs/ux-ui/design.md` · `docs/trd/trd.md` · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`.
