# `bugfix/reported-results-center-scoping` — Design

**Depth:** Full (Bug Mode) · Links: `requirements.md` (same folder), `proposal.md` (confirmed root cause + Ángel's product decision)

## 1. Summary

Add a new nullable column (`toc_indicator_target_id`) to `result_indicators_targets`, persist it at result-creation time from a value the client already has per Reporting-table row, and switch two read paths — the "Reported results" drawer panel and the Reporting table's per-row Achieved/QA%/Prel% computation — from their current shared/intersection-based isolation keys to an exact match on this new column. The Global Units / Work Packages rollup (`getIndicatorContributions`) is explicitly untouched — its node-level pooling across combination-groups is believed correct-by-design and was not part of Ángel's confirmed rule. Biggest trade-off: historical (pre-fix) rows have no value in the new column and keep today's imperfect behavior — this spec forward-fixes, it does not backfill (see §11).

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server modules touched:**
  - `onecgiar-pr-server/src/api/results/results-toc-results/entities/result-toc-result-target-indicators.entity.ts` (new column)
  - `onecgiar-pr-server/src/api/results-framework-reporting/application/commands/create-result-from-framework/framework-result-toc-indicators.service.ts` (persist it)
  - `onecgiar-pr-server/src/api/results-framework-reporting/dto/create-results-framework.dto.ts` (`ResultsFrameworkTocIndicatorDto` gains the field)
  - `onecgiar-pr-server/src/api/results-framework-reporting/application/queries/get-existing-result-contributors/*` (filter by it)
  - `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts` (`getIndicatorContributionsByCenter` + `sumContributionsForCenters`)
  - `onecgiar-pr-server/src/migrations/` (new migration)
- **Client modules touched:**
  - `onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/dashboard-lab/` — thread the row's already-known `toc_indicator_target_id` from the Reporting table through the indicator drawer into the create-result payload. Exact file(s) in the create chain (`indicator-drawer` → `lab-report-form` → the framework create API call) need one confirmation pass at task-start (see §13) — the data is already present server-side per row (`TocResultRow.toc_indicator_target_id`), so this is wiring an existing value through, not a new fetch.
- **External integrations touched:** none — `toc_indicator_target_id` is already a ToC-side (`DB_TOC`) column this repository already reads elsewhere (`findByCompositeCode`); no new integration.

### 2.2 Sequence / interaction diagram

**Write path (new):**

```
[Reporting table row, e.g. "CIMMYT" group, toc_indicator_target_id=607878]
  └── user clicks Report → indicator-drawer (report tab) → lab-report-form → create submit
        └── payload now carries toc_indicator_target_id alongside existing indicator_id/related_node_id
              └── POST .../create/header (or framework create entry point)
                    └── FrameworkResultTocIndicatorsService.upsertTocIndicators
                          ├── finds/creates results_toc_result_indicators row (unchanged: keyed by
                          │     results_toc_results_id + toc_results_indicator_id = related_node_id)
                          └── _upsertIndicatorTargetRecord
                                └── result_indicators_targets row NOW ALSO stores toc_indicator_target_id
```

**Read path 1 — Reported results panel (fixed):**

```
[Indicator drawer, Reported results tab, opened for a specific row]
  └── GET_ExistingResultsContributors(tocResultId, relatedNodeId, tocIndicatorTargetId, scope)
        └── GetExistingResultContributorsToIndicatorsHandler
              └── ExistingResultContributorsLoaderService.loadContributions
                    ├── existing narrowing by related_node_id (unchanged, coarse pre-filter)
                    └── NEW: additional narrowing — only rows whose result_indicators_targets
                          .toc_indicator_target_id equals the panel's group id, OR (fallback,
                          RRC-R-8) is NULL (pre-fix row, keeps today's coarse-only behavior)
```

**Read path 2 — Reporting table Achieved/QA%/Prel% (fixed):**

```
[fetchAndGroupTocResults]
  ├── findByCompositeCode's row query → row.toc_indicator_target_id (already correct, unchanged)
  ├── getIndicatorContributionsByCenter → base subquery NOW ALSO selects/groups by
  │     rit.toc_indicator_target_id (from result_indicators_targets, once persisted)
  └── sumContributionsForCenters → NEW: when the contributing entry carries a
        toc_indicator_target_id, match it EXACTLY against row.toc_indicator_target_id
        (no more center-set intersection for entries that carry the new anchor);
        entries with a NULL toc_indicator_target_id (pre-fix data) fall back to today's
        center-intersection behavior, unchanged (RRC-R-8)
```

## 3. Data Model Changes

### 3.1 Entities

| Entity | Path | Change |
|---|---|---|
| `ResultIndicatorTarget` | `api/results/results-toc-results/entities/result-toc-result-target-indicators.entity.ts` | `+ toc_indicator_target_id (bigint, nullable, name: 'toc_indicator_target_id')` — no index needed beyond the existing lookups this spec adds (read paths filter within an already-narrowed row set by `result_toc_result_indicator_id`/`toc_result_id`, so a composite index is not required for correctness; add one only if the Testing Plan's query-plan check in §8 shows it matters). |

No other entity changes. `ResultsTocResultIndicators` (`results_toc_result_indicators`) is NOT touched — its existing `toc_results_indicator_id` (= `related_node_id`) narrowing stays as the coarse first-pass filter; the new column lives one level down, on the target/contribution row, where `contributing_indicator` already lives.

### 3.2 Migrations

- Migration name: `src/migrations/<timestamp>-AddTocIndicatorTargetIdToResultIndicatorsTargets.ts` (generate via `npm run migration:generate -- ./src/migrations/AddTocIndicatorTargetIdToResultIndicatorsTargets -d ./src/config/orm.config.ts` once the entity change lands).
- `up`: `ALTER TABLE result_indicators_targets ADD COLUMN toc_indicator_target_id BIGINT NULL`.
- `down`: `ALTER TABLE result_indicators_targets DROP COLUMN toc_indicator_target_id`.
- Additive, nullable, no default-value backfill statement — historical rows land as `NULL` by construction, which is the explicit, tested fallback state (`RRC-R-8`, `RRC-AC-6`), not an oversight.
- `npm run migration:check` MUST pass before this design's PR is opened, per `onecgiar-pr-server/CLAUDE.md`.

### 3.3 CLARISA / external-data implications

None. `toc_indicator_target_id` is sourced from `${DB_TOC}.toc_result_indicator_target`, already read by this same repository (`findByCompositeCode`) — no new external endpoint, no new CLARISA catalog.

## 4. API Surface

### 4.1 New / changed endpoints

No new endpoint. Two existing surfaces change shape additively:

| Field | Value |
|---|---|
| **Method + path** | Framework create entry point that calls `FrameworkResultTocIndicatorsService.upsertTocIndicators` (the exact controller route is inherited from the existing create-result flow — no new route). |
| **Change** | `ResultsFrameworkTocIndicatorDto` gains an optional `toc_indicator_target_id?: number \| string` field. |
| **Request DTO** | `ResultsFrameworkTocIndicatorDto` — additive optional field, `class-validator` `@ApiPropertyOptional`, no `required` change. |
| **Errors** | No new error class. An invalid/non-numeric value is treated as absent (parsed defensively, same posture as the existing `number_target`/`target_date` handling in `_upsertIndicatorTargetRecord`), never a hard 400 — this is Bug Mode fixing silent data loss, not adding a new validation surface. |

| Method + path | `GET .../existing-result-contributors` (exact route per `GetExistingResultContributorsToIndicatorsHandler`'s existing controller binding) |
|---|---|
| **Change** | Query gains an optional `tocIndicatorTargetId` parameter alongside the existing `resultTocResultId`/`tocResultIndicatorId`/`scope`. |
| **Backwards compatibility** | Omitting it preserves today's exact behavior (coarse `related_node_id`-only filtering) — this keeps any other caller of this endpoint (if one exists beyond the indicator drawer) working unchanged. |

### 4.2 Bilateral / platform-report impact

None — neither touched surface is read by `/api/bilateral/*` or `/api/platform-report/*`.

## 5. Server Workflow / Business Rules

- **`RRC-DD-1` — The new anchor lives on `result_indicators_targets`, not `results_toc_result_indicators`.** The latter is keyed by `(results_toc_results_id, toc_results_indicator_id)` and its whole reason to exist is one row per result-per-indicator-node link, regardless of how many combination-group targets that node has. `result_indicators_targets` already stores one row per contribution-to-a-specific-target (`number_target`, `target_date`, `contributing_indicator`) — the natural, minimal place to also store *which* target (`toc_indicator_target_id`) that contribution was made against. No new table needed.
  - **Alternatives considered:** (a) a new join table `results_toc_result_indicator_targets_map` — rejected, over-engineered for a single new scalar column with no independent lifecycle; (b) reuse `number_target`+`target_date` as the permanent anchor (Option B from `proposal.md`) — rejected as the *primary* mechanism per Juan David's own finding that it is positional and breaks silently on ToC reorder; kept only as a documented historical-data limitation, not as new-data policy.

- **`RRC-DD-2` — Both read-side fixes keep a NULL-safe fallback to today's behavior, never a hard failure.** Every touched query already has a working (if imprecise) path for indicators that don't carry the new anchor yet. Both fixes are structured as "prefer the exact match when present, else behave exactly as before" — this is what makes `RRC-R-8`/`RRC-AC-6` (historical rows) achievable without a backfill migration in this spec.
  - **Consequence:** a mixed state exists in production for a while — some contributions isolated correctly (new), some still coarse/intersection-based (historical) — until either enough time passes that no un-anchored rows are live-relevant, or a future backfill spec (`RRC-OQ-1`) closes the gap. This is communicated explicitly, not hidden.

- **`RRC-DD-3` — `getIndicatorContributionsByCenter`'s query gains one column, `sumContributionsForCenters` gains one branch, nothing else moves.** The `base` subquery (lines ~1056-1086 of `aow-bilateral.repository.ts`) already joins through `result_indicators_targets` as `rit` — add `rit.toc_indicator_target_id` to its `SELECT`/`GROUP BY` list, and carry it into the returned entry shape (`contributionsByCenter`'s per-entry object gains `tocIndicatorTargetId: number | null`). `sumContributionsForCenters` then branches: if the entry's `tocIndicatorTargetId` is non-null, require it to equal the caller-supplied `row.toc_indicator_target_id` exactly (ignore `centerIds` intersection entirely for that entry); if it is null, fall back to today's `centerIds.some(...)` intersection check unchanged.

- **`RRC-DD-4` — `existing-result-contributors` gains the same two-tier match, one level up (TypeORM `find`, not raw SQL).** `ExistingResultContributorsLoaderService.loadContributions`'s existing nested `where` on `obj_results_toc_result_indicators.obj_result_indicator_targets` narrows already; add a condition there: match `toc_indicator_target_id` to the caller-supplied value when the caller supplies one, using an `OR toc_indicator_target_id IS NULL` clause (via TypeORM `Brackets`/raw `Or` — implementation detail for `tasks.md`, not re-litigated here) so a historical row without the anchor still surfaces exactly as it does today. When the caller passes no `tocIndicatorTargetId` at all (e.g. an old client build mid-rollout), behavior is unchanged from today (coarse-only).

- **`RRC-DD-5` — `getIndicatorContributions` (the rollup) is explicitly not touched.** See Non-Goals in `requirements.md`. Its docstring (`RFR-DD-1`, sibling spec) already states the pooled-by-node behavior is intentional for HLO/AoW/Program-level totals. Nothing in this design assumes otherwise; if that assumption is later disproven, it is a new, separately-confirmed spec — this design does not piggyback a second business-rule guess onto Ángel's answer, which was scoped to row-level attribution.

Cite `docs/trd/trd.md` §"Results Framework Reporting" — same as the sibling spec, no dedicated `W#` workflow id exists for this reporting read/write path.

## 6. Frontend Plan

### 6.1 Routes / modules

No new route. `pages/result-framework-reporting/pages/dashboard-lab/` — existing module, existing components.

### 6.2 Components & services

- **`dashboard-lab.component.ts`** — `manageIndicator(row, hlo, tab, node)` already forwards whatever fields exist on `row`/`node` into the drawer (`indicator: any`, no interface narrowing today). `row.toc_indicator_target_id` is already present (it comes from `findByCompositeCode`'s already-correct per-row data, confirmed by code read) — no new server call needed to get it to the drawer.
- **`indicator-drawer.component.ts`** — its `loadExisting()` method already reads `ind?.related_node_id`; extend it to also read `ind?.toc_indicator_target_id` and pass it as the new optional parameter on `GET_ExistingResultsContributors` (server-side default: omitted = today's behavior, per `RRC-DD-4`).
- **Create-submit path (`lab-report-form` and/or the component that assembles the framework-create payload)** — needs the same value threaded into the `indicators` array sent on create, matching `ResultsFrameworkTocIndicatorDto.toc_indicator_target_id` (§4.1). **The exact file/line in this chain was not conclusively traced during design** (searched `lab-report-form.component.ts` — no `indicator_id`/`related_node_id`/`number_target` references found there, meaning the payload assembly happens in a sibling component or shared API method not yet identified). Flagged in §13 as the first thing to confirm at task-start — low risk (threading an already-available value, not inventing new state), but must not be guessed at implementation time without a quick trace.
- **`results-api.service.ts`** (or the specific feature service backing `GET_ExistingResultsContributors`) — add the new optional query param, `HTTP_METHOD_descriptiveName` convention preserved.

### 6.3 Design system usage

Not applicable — no new UI, no new component, no visual change. This is a data-correctness fix flowing through existing surfaces.

### 6.4 Real-time / notification UX

Not applicable.

## 7. Security & Authorization

No change. Both touched endpoints stay behind the same JWT-protected `/api/results-framework-reporting/*` / framework-create surface as today; no new role gate; the new DTO field and query param are optional, validated defensively (never trusted to be well-formed, same posture as existing `number_target`).

## 8. Performance & Capacity

- New column: one `BIGINT NULL` on an existing, already-indexed-by-FK table — negligible storage/perf cost.
- `getIndicatorContributionsByCenter`: one more `SELECT`/`GROUP BY` column on an already-grouped subquery — negligible.
- `existing-result-contributors`: the new `OR ... IS NULL` condition is evaluated over an already-narrowed candidate set (by `toc_result_id` + status), not a table scan — negligible.
- No new N+1 risk — both fixes extend existing single-query paths, no new per-row query introduced.

## 9. Observability

No new structured logging required. If useful during rollout, a one-line `Logger.debug` confirming how many `result_indicators_targets` rows are missing the new column (i.e., how large the historical-fallback population is) would directly inform `RRC-OQ-1` (whether a backfill is worth doing) — optional, not required by any requirement here.

## 10. Testing Plan (forward-looking)

- **Write path (`RRC-AC-1`):** unit test on `FrameworkResultTocIndicatorsService`/`_upsertIndicatorTargetRecord` asserting the new column is persisted when the DTO supplies `toc_indicator_target_id`, and remains `NULL` when it doesn't (no regression for callers that don't send it yet).
- **Reported results panel (`RRC-AC-2`, `RRC-AC-6`):** extend `existing-result-contributors-loader.service.spec.ts` (or the handler spec) — seed two combination-groups sharing a center, one result linked (with the new anchor) to only one group; assert the sibling group's contributor list stays empty. A second case seeds a result WITHOUT the anchor (historical) and asserts today's coarse behavior is preserved unchanged.
- **Reporting table Achieved/QA%/Prel% (`RRC-AC-3`, `RRC-AC-5`, `RRC-AC-6`):** extend `aow-bilateral.repository.spec.ts` — same two-group seed, asserting `sumContributionsForCenters` isolates a solo-center contribution from a multi-center sibling row when the anchor is present, and falls back to today's intersection behavior when it's absent. A dedicated non-regression case re-asserts a single-node/single-center indicator's existing values are byte-identical before/after (`RRC-AC-5`).
- **Client (`RRC-AC-7`):** component/unit test on the create-payload assembly point (identified per §13) asserting `toc_indicator_target_id` is included when the source row carries one.
- Defect-class → gate mapping: identical structure to the sibling spec — every defect class here is a wrong-isolation-key class, caught only by seeded-row repository tests, never by reading query text. No visual/UI gate needed (no rendered surface changes); the one presence-only check (DTO field exists) is explicitly not treated as proof of the behavior — the seeded-row tests are what prove the behavior itself.

## 11. Backwards Compatibility & Migration Plan

- Migration is additive/reversible (§3.2). No data loss on `down`.
- API contracts: both touched surfaces gain optional fields/params only — no breaking change for any caller that doesn't yet send them.
- **No backfill, decided (`RRC-OQ-1`, resolved 2026-09-21)** — historical rows keep today's imperfect isolation permanently, not "until a follow-up backfill." Rejected after risk assessment: the only available anchor (`number_target`+`target_date`) is positional and unverifiable against ToC's reorder history, so an automated backfill risks confidently mislabeling a historical row — worse than the known, tested `NULL` fallback. `RRC-R-8`/`RRC-AC-6` make that fallback an explicit, tested requirement, not an unhandled edge case. If historical correctness is ever needed, it requires its own separately-scoped, manually-verified effort — not an automated migration.
- Communication: worth a heads-up to Nicoleta/PMU and Ángel that newly-created results will isolate correctly immediately, but already-reported historical contributions on combination-group indicators will keep showing today's behavior (including the exact CIMMYT/IITA cross-attribution reported) until a follow-up backfill — not a regression, a known scope boundary.

## 12. Design Decisions (ADRs)

### `RRC-DD-1` — New anchor lives on `result_indicators_targets`

See §5. Smallest correct placement; no new table.

### `RRC-DD-2` — NULL-safe fallback everywhere, no hard failure on historical data

See §5. Enables shipping without a backfill migration while keeping `RRC-R-8` honest (no silent misbehavior — the fallback IS today's exact behavior, not a guess).

### `RRC-DD-3` — `getIndicatorContributionsByCenter` isolation moves from center-set intersection to exact-`toc_indicator_target_id` match (when present)

- **Context:** Ángel's confirmed rule (`proposal.md` §9) rules out any attribution scheme based on set membership/intersection — a solo-center result must never count toward a multi-center sibling group.
- **Decision:** exact match on the new anchor when both sides have it; unchanged intersection fallback otherwise.
- **Alternatives considered:** keep intersection but add a "solo group only" special case (rejected — doesn't generalize past the 2-group example, still wrong for 3+ way overlaps); resolve isolation entirely client-side (rejected — same reasoning as the sibling spec's `RFR-DD-1`, leaks raw contribution data over the wire and duplicates logic).
- **Consequences:** correct, generally smaller per-row numbers for any indicator with overlapping combination-groups; a historical-data blind spot until `RRC-OQ-1` is resolved.
- **Step 2.3 reversion challenge — "what does removing center-set intersection matching break?"** Intersection matching is not removed, only disabled *per entry* once that entry carries the new anchor; entries without it keep the exact same intersection behavior they have today (`RRC-DD-2`). The only behavior that changes is for NEW, anchored contributions — and that change is the confirmed fix itself (Ángel's rule), not a side effect. Nothing that depends on intersection matching for historical/un-anchored data is touched. No unaddressed breakage found — the two mechanisms coexist by data availability, not by replacement.

### `RRC-DD-4` — `existing-result-contributors` gains the same anchor, applied via TypeORM `find`, not raw SQL

- **Context:** this loader already uses TypeORM's `find`/nested-relation `where`, unlike the raw-SQL repository the sibling fix touched.
- **Decision:** extend the same nested `where` with an `OR IS NULL`-safe condition rather than rewriting the loader as raw SQL.
- **Alternatives considered:** migrate the whole loader to raw SQL for symmetry with `aow-bilateral.repository.ts` — rejected, unnecessary scope increase for a bug that doesn't require it; TypeORM's query builder handles the needed condition.
- **Consequences:** the two fixes (panel vs. table) end up implemented in two different query styles (TypeORM find vs. raw SQL) — consistent with how each already worked before this spec, not a new inconsistency introduced by it.

### `RRC-DD-5` — `getIndicatorContributions` rollup is out of scope

See §5 and `requirements.md` Non-Goals. Recorded here so a future reader of this design doesn't assume it was silently fixed too.

## 13. Open Gaps & Follow-ups

- **Must confirm before/at task-start:** the exact client component/service that assembles the `indicators` array for the framework-create payload (searched `lab-report-form.component.ts`, not found there — likely a sibling component, `guided-creation`, or a shared API method). Low risk (wiring an existing value), but not guessed here.
- **`RRC-OQ-1` (RESOLVED — no backfill, ever, via the positional anchor):** decided 2026-09-21, see §11. Historical rows stay on today's fallback behavior permanently.
- **Risk accepted:** a mixed-fidelity production state (new data isolated correctly, historical data not) persists until `RRC-OQ-1` is resolved — communicated to stakeholders per §11, not hidden.
- **Out of this spec, flagged for awareness:** if the Global Units / Work Packages rollup (`getIndicatorContributions`) is later reported as *also* wrong for combination-group indicators, that needs its own confirmed business-rule check (does a portfolio-wide rollup want pooling or isolation?) — do not assume Ángel's answer here extends there.

## 14. Budget (Step 2.4)

- **Expected tasks:** 5 — (1) migration + entity, (2) write-path DTO/service capture, (3) client wiring, (4) `existing-result-contributors` read-path fix + tests, (5) `getIndicatorContributionsByCenter` read-path fix + tests.
- **Expected LOC:** ~180–280 (schema/entity ~15, DTO/service ~30–40, client wiring ~30–50, two read-path fixes + their tests ~150–200 combined — test code dominates, consistent with the sibling spec's ratio).
- **Expected review rounds:** 2 (server-side change is mechanically similar to the already-reviewed sibling spec, but spans more files; client wiring is a first pass in this spec, likely to need one correction round once the exact create-payload component is confirmed).
- Depth **Full** confirmed appropriate — migration + write path + two read paths + client wiring, exactly the criteria that route a bugfix to Full instead of Lite/Standard. **PR strategy:** recommend splitting into 2 PRs — PR1 (migration + entity + write-path capture + client wiring, since read-path fixes are inert without data to read) and PR2 (both read-path fixes + their regression tests), so PR1 can start correctly isolating NEW data immediately while PR2 is reviewed.

## Required cross-references

- `docs/specs/bugfix/reported-results-center-scoping/requirements.md` (same folder).
- `docs/specs/bugfix/reported-results-center-scoping/proposal.md` (confirmed root cause, Ángel's product decision).
- `docs/specs/bugfix/indicator-achieved-value-per-center/design.md` (sibling `RFR-DD-1`/`RFR-DD-2`, extended not reverted here).
- `docs/trd/trd.md` §"Results Framework Reporting".
- `docs/prd.md` (ToC / Area of Work tracking — no specific `AC-#`, defect fix).
