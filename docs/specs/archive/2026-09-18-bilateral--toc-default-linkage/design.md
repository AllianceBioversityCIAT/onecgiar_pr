# Design — Bilateral ToC question: project default first, detail on demand

## Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bilateral/toc-default-linkage/` |
| Module code | `BIL-TOC` |
| Depth | Full |
| Status | approved — 2026-09-18 |
| Requirements | [`requirements.md`](./requirements.md) |
| Baseline | `docs/prd.md` (AC-1, AC-4, AC-6) · `docs/ux-ui/design.md` (bilateral form, tokens §7) · `docs/trd/trd.md` (bilateral module, ToC read path) · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md` |

## 1. Summary

The bilateral ToC block gets a read-only **default block** built from the lead project's linkage in `Integration_information`, plus a YES/NO question. YES stores the decision and materializes the project's ToC **node** rows on the result (no indicator, target or contribution rows). NO opens the existing detail form, now with typology matching enforced on the server. Results whose project has no linkage keep today's form.

Biggest trade-off accepted: YES copies node rows into `results_toc_result` (data duplication) so that every existing reader of that table keeps seeing a linked node, instead of leaving YES results looking "unmapped".

## 2. Architecture Overview

### 2.1 Where this lives

- **Server:** `api/bilateral` (`BilateralCenterService.getTocState/saveTocMapping`, DTO), `api/results/results-toc-results` (`aow-bilateral.repository.ts`, `results-toc-results.service.ts`, entity), `toc/toc-results` (typology verdicts). No migration (see DD-1).
- **Client:** `pages/bilateral/components/section-toc` (+ one new child component), `pages/bilateral/services/bilateral-auto-save.service.ts`, `shared/services/api/bilateral-api.service.ts`.
- **External:** `Integration_information` (read only).

### 2.2 Sequence

```
[section-toc]  ngOnInit -> GET /api/bilateral/center/toc-state/:resultId
  BilateralCenterService.getTocState
    ├── owner initiative (primary SP)            [existing]
    ├── active results_toc_result rows           [existing, now all rows + mode]
    ├── lead project id (results_by_projects)    [new helper]
    ├── phase uuid of the result's version       [existing helper]
    └── AoWBilateralRepository.findProjectTocLinkage(project, program code, phase, year)  [new]
  <- { ...existing fields, toc_linkage_mode, project_default: { project_name, nodes[] } | null }

[user answers YES]  PATCH toc-mapping  { toc_linkage_mode: 'project_default', result_toc_results: [default nodes] }
  updateTocResultPartial: deactivate rows not in set, upsert one row per node, no indicator rows
[user answers NO]   PATCH toc-mapping  { toc_linkage_mode: 'custom', ... existing payload }
  guard: each toc_result_id must pass getTocResultTypologyVerdicts, else 400
```

## 3. Data Model Changes

### 3.1 Entities

| Entity | Path | Change |
|---|---|---|
| `ResultsTocResult` | `api/results/results-toc-results/entities/results-toc-result.entity.ts` | **No change.** The mode is derived on read (DD-1) |

No new table or column. `results_toc_result_indicators` and `result_indicators_targets` are untouched by YES.

### 3.2 Migrations

None. `npm run migration:check` must simply stay green.

### 3.3 External data

- Reads only: `toc_result_projects`, `toc_results`, `toc_results_indicators`, `toc_result_indicator_target` in `env.DB_TOC`. No CLARISA endpoint change.

## 4. API Surface

### 4.1 Changed endpoints

| Field | `GET /api/bilateral/center/toc-state/:resultId` | `PATCH /api/bilateral/center/toc-mapping/:resultId` |
|---|---|---|
| Auth / role | unchanged (JWT, centre-scoped) | unchanged |
| Request | none | `SaveBilateralTocMappingDto.result_toc_result` gains optional `toc_linkage_mode` (`IsIn(['project_default','custom'])`), an **intent flag used only during the request and never stored** |
| Response | existing fields plus `toc_linkage_mode` (`project_default`, `custom` or null, derived on read) and `project_default` (`{ project_id, project_name, nodes[] }` or null) where each node has `toc_result_id`, `toc_level_id`, `level_name`, `title`, `indicators[{ id, description, type, targets[{ year, value }] }]` | unchanged shape |
| Errors | linkage read failure returns `project_default: null` (never 5xx); logged server-side | 400 when `custom` carries a node/indicator that fails the typology verdict; existing 404 when no owner initiative |
| Telemetry | log event on linkage-read failure with result id only | log rejected typology verdict with result id and node ids only |

### 4.2 Bilateral impact

Additive only (AC-4). The two new response fields and one new request field go into the change log of `bilateral-result-summaries.en.md` if `toc-state` is documented there; task BIL-TOC-T-8 verifies and writes the row.

## 5. Server Workflow / Business Rules

- **Lead project:** new small helper next to the existing read pattern (`results_by_projects` active, `ORDER BY is_lead DESC, id DESC LIMIT 1`, as in `result.repository.ts:4071`). Returns null when the result has no project.
- **Linkage read:** new `findProjectTocLinkage` in `aow-bilateral.repository.ts`. It starts from `toc_result_projects` filtered by `project_id`, joins `toc_results` on `related_node_id = toc_result_id_toc`, filters `official_code` to the owner initiative's code (same trim/upper rule as `findBilateralProjectsByProgramOfficialCode`), `phase` to the result's version phase uuid, and active nodes only; left-joins active `toc_results_indicators` and its targets for the reporting year: the project's own target (`toc_result_indicator_target.project_id`) when present, otherwise the indicator's general target (`project_id IS NULL`); only 209 of ~60k target rows are project-specific. **Type caveat (real schema):** `toc_result_projects.project_id`, `toc_result_id_toc`, `related_node_id` and `target_date` are `varchar`, while `results_by_projects.project_id` and `toc_result_indicator_target.project_id` are numeric; bind the project id as a string against `trp.project_id` (an int parameter would defeat any index) and `CAST` when joining to the numeric column. Indicators join through `toc_results_indicators.id = toc_result_indicator_target.id_indicator`. One query; grouping into nodes happens in the service, so cost does not grow per node.
- **Phase uuid:** the result's version `toc_pahse_id`, with the existing `getTocPhaseIdByVersionId` fallback (as `findTocResultByConfigV2`).
- **Mode resolution on read (derived, nothing stored):** with a default available, evaluate the result's active `results_toc_result` rows for the owner initiative: no rows → null (unanswered); any row with `planned_result = false`, or any row whose node is outside the project's default node set, or any active `results_toc_result_indicators` row → `custom`; otherwise (every row is a default node and there are no indicator rows) → `project_default`. Without a default the mode is null and the fallback form applies (see DD-4).
- **YES write:** client sends the default nodes it displayed; the service accepts only node ids that the same linkage query returns for this result (re-derived server-side, never trusted from the payload). Rows not in the set are deactivated by the existing `_deactivateMissingRecords`; each node gets one row with `planned_result = true` and the node's level, using the same category-to-level mapping (OUTPUT=1, OUTCOME=2, EOI=3) that `LinkFrameworkResultTocService` uses when a result is created from the AoW view. `_handleIndicators` is skipped for this intent.
- **NO write:** existing planned path, plus a guard calling `getTocResultTypologyVerdicts(tocResultIds, resultTypeId)`; any false verdict raises a 400.
- **Switch NO to YES:** the same write deactivates custom rows (soft), and the client asks for confirmation first (R-7).
- **Concurrency:** last write wins per autosave, as today. Transaction scope follows the existing `updateTocResultPartial` behaviour.
- **Reads that assume one active row:** `getTocState` currently uses a single `findOne` (L693). It changes to read all active rows. Task BIL-TOC-T-3 also greps other readers of `results_toc_result` that assume one row per result and records each finding.

## 6. Frontend Plan

### 6.1 Components & services

- **New child** `section-toc-default` (standalone, presentational): inputs `projectDefault`, `mode`, `readOnly`; output `modeChange`. Renders the default block and the YES/NO control. Built with **Spartan** components (team standing rule; `section-toc` today uses `pr-*` components, the new child is the visual change, so it follows the rule), with tokens from `docs/ux-ui/design.md` §7.
- **`section-toc`:** new signals `linkageMode` and `projectDefault`, and computed `hasProjectDefault`. When `hasProjectDefault()` is true: hide the P/A-defer checkbox and the "Can this result be mapped to a ToC KPI?" question, show the child, and show the existing detail block only when `linkageMode() === 'custom'`. When false: today's form, unchanged. The existing `publishTocMds` items stay `optional: true`.
- **NO branch list:** the client stops relying on the "Review needed" badge alone and hides or disables indicators that fail the typology match; the server guard is the source of truth. The client keeps calling the existing level lookup.
- **Service:** `bilateral-auto-save.service.ts` `loadTocState` return type is an inline literal today; extract a named interface `BilateralTocState` (file-local) with the two new fields, and add `toc_linkage_mode` to the `saveTocMapping` input. `GET_tocState` stays typed as it is.
- **State boundary:** component-local signals, as today.

### 6.2 Design system, a11y, i18n

- YES/NO is a two-option toggle group with a visible label; keyboard operable; the default block is a labelled region; loading uses the existing `app-form-skeleton`; empty/error states do not render (fallback form appears instead).
- Strings follow the bilateral module's current convention (inline text in templates today; no new i18n mechanism introduced).

## 7. Security & Authorization

No new endpoints; JWT and centre scoping unchanged. `toc_linkage_mode` validated by `IsIn`. Node ids for YES are re-derived server-side, so a client cannot attach arbitrary nodes. No tokens, URLs or connection strings in logs (`.cursorrules`, AC-9).

## 8. Performance & Capacity

One added query per `toc-state` read, bounded by the project's node count (real data reaches 23, median 2). Indexes on the `Integration_information` side are outside this repo; if the query is slow on real data, that is raised at execution, not guessed here (OQ-1 sample checks include an `EXPLAIN` of the query).

## 9. Observability

Two log events described in §4.1. No metric changes.

## 10. Testing Plan

- **Server unit** (`bilateral-center.service.spec.ts`, which has no `getTocState`/`saveTocMapping` tests today, so these are net-new): mode resolution (YES, custom, legacy null, none), YES writes no indicator rows, typology 400, server-side node re-derivation, linkage-read failure returns `project_default: null`.
- **Repository:** query-shape tests with mocked `dataSource.query` (two projects with the same name, nodes of two Programs).
- **Client** (`section-toc.component.spec.ts` overrides the template, so it tests signals and methods): mode transitions, fallback when no default, legacy load, NO to YES confirmation. Component-level DOM for the new child gets its own spec with its real template.
- **Not coverable in Jest:** real cross-schema data and visual layout. Covered by the hand-off SQL samples and a browser pass at the HITL pause (see requirements defect table).
- Scoped runs only (`--testPathPattern`), never the full suite.

## 11. Backwards Compatibility & Migration Plan

- No schema change and no backfill: existing results are read by the derivation rule, so a result with saved indicators stays `custom` and one with none is `null` or `project_default` by data.
- Additive API. Rollback: revert the client and server code; nothing to undo in the DB. Rows written by YES are ordinary node rows, so an old client reading them sees a normal node link.
- No feature flag: behaviour only changes for results whose project has a linkage and which have no saved mapping.

## 12. Design Decisions

### BIL-TOC-DD-1 — Derive the mode from existing rows; no migration

- **Context:** YES must survive reload and be visible to reviewers. The project-to-node link itself is never copied into PRMS tables: it is read at query time from `Integration_information` (the AoW view lists projects the same way), and results created from the AoW view already store their node in `results_toc_result` with no extra flag. A new column for one flag would add a migration for something the rows already imply once YES writes node rows (DD-2).
- **Decision:** no schema change. Mode is derived on read: node rows within the project's default set and no indicator rows = `project_default`; anything else saved = `custom`; nothing saved = unanswered.
- **Alternatives:** nullable `toc_linkage_mode` column (rejected per the team's steer: schema change for a derivable fact); separate table (rejected: a join for one flag).
- **Consequences:** one ambiguity is accepted. A user who answers NO, picks one of the project's own nodes and has not yet chosen an indicator will see YES on reload, because that state is data-identical to YES. It resolves as soon as an indicator is saved. Reviewers cannot see an explicit "kept default" flag, only the derivation.

### BIL-TOC-DD-2 — YES materializes node rows, not indicator rows

- **Context:** requirements OQ-3. With read-time derivation only, a YES result has no `results_toc_result` node row and any report joining that table sees it as unmapped. A null-node marker row (like the unplanned special case) has the same problem.
- **Decision:** on YES, write one active row per default node (`planned_result = true`, mode `project_default`), and no rows in `results_toc_result_indicators` / `result_indicators_targets`.
- **Alternatives:** read-time derivation (rejected: reports see nothing); also materialize indicator rows (rejected: "nothing changes" means no per-result indicator claim, and target values belong to the project).
- **Consequences:** node rows can go stale if the project linkage later changes (accepted; R-2 keeps the rows until the user changes them, and because the mode is derived, a stale set that no longer matches the default reads as `custom`, which shows the detail form instead of losing the data). Indicator-level counts do not include YES results (open gap, §13). This supersedes the read-time recommendation in `proposal.md` §10, which was written before the row-reader constraint was checked.

### BIL-TOC-DD-3 — Lead project only, primary SP's Program only

- **Decision:** default comes from the lead project and the owner initiative's `official_code`, using the join key `project_id`.
- **Alternatives:** union of all contributing projects (rejected pending OQ-2, more noise, ambiguous ownership); no Program filter (rejected: would show another Program's nodes).

### BIL-TOC-DD-4 — Legacy and fallback rules

- **Decision:** a result with saved data that does not match the derivation for `project_default` is `custom`; a legacy unplanned row (`planned_result = false`, "why reported" text) keeps the old fallback form because the new question has no "not mappable" answer. Results with no default use the old form.
- **Consequences:** the two flows coexist until a later cleanup.

### BIL-TOC-DD-5 — Enforce typology on the server for `custom`, and apply it in the NO list

- **Context:** the bilateral flag currently skips server-side typology filtering (`bilateral=true` in `_buildPlannedIndicatorFilter` and `_appendResultTypeIndicatorFilter`); matching is only a client badge. Requirement R-3 asks for enforcement.
- **Decision:** reuse `getTocResultTypologyVerdicts` as the guard on the bilateral partial path when the mode is `custom`; the client hides mismatches. The level lookup keeps `bilateral=true` (not changed here) to limit blast radius.
- **Consequences:** bilateral results whose type has a typology pattern can no longer save a mismatching node. Recorded in the reversion challenge below.

### Reversion challenge (Step 2.3)

| Reverted behavior | "What does removing this break?" | Outcome |
|---|---|---|
| "Can this result be mapped to a ToC KPI?" and the P/A-defer checkbox hidden when a default exists | Results that truly do not map lose the "why reported" text field; the P/A defer hint disappears | Accepted: with a project linkage the result is already linked, and the requester's flow has no "not mappable" branch. Follow-up: OQ-6 asks whether any consumer reads `toc_progressive_narrative` for unplanned bilateral results |
| Bilateral results no longer bypass typology on save | A bilateral result of a typed result whose only reachable nodes fail the verdict cannot save a custom link | Accepted per the requester ("same rule as pooled"); mitigated because `getTocResultTypologyVerdicts` treats nodes without a conflicting indicator as neutral. Confirm with OQ-4 |

### Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Tasks | 8 |
| LOC (incl. tests) | ~680 |
| Review rounds | 2 |

The estimate sits inside Full depth. `/akili-execute` stops and escalates if actuals exceed the budget.

## 13. Open Gaps & Follow-ups

- **OQ-1** real-data checks (target `project_id` NULLs, several nodes per project, phase rows) and an `EXPLAIN`: user hand-off before execution of the repository task.
- Indicator-level reporting does not count YES results (DD-2 consequence). Revisit if reports need it.
- **OQ-6 (new):** does anything read `toc_progressive_narrative` of unplanned bilateral results?
- Stale node rows after a later project relinking: no sync job in scope.
- Risk: other readers assuming one active `results_toc_result` per result; mitigated by the T-3 grep.

## Required cross-references

[`requirements.md`](./requirements.md) · `docs/prd.md` · `docs/ux-ui/design.md` · `docs/trd/trd.md` · `onecgiar-pr-server/docs/bilateral-result-summaries.en.md`.
