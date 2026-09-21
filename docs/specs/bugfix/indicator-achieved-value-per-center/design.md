# `bugfix/indicator-achieved-value-per-center` — Design

**Depth:** Lite (Bug Mode) · Links: `requirements.md` (same folder), `proposal.md` (confirmed root cause)

## 1. Summary

Fix `AoWBilateralRepository.getIndicatorContributions()` so achieved/preliminary sums are grouped and joined by the **node-specific** indicator id (`tri.id`) instead of the **shared catalog** indicator id (`tri.toc_result_indicator_id`). Add one additional aggregate — the display "Achieved" figure — computed as the union of QualityAssessed/Submitted/Approved statuses, so it reflects submitted progress before QA concludes without any temporal "switch-over" logic. Purely a read-side SQL correction inside one repository method; no schema change, no caller shape change.

## 2. Architecture Overview

### 2.1 Where this lives in the system

- **Server modules touched:** `onecgiar-pr-server/src/api/results/results-toc-results/repositories/aow-bilateral.repository.ts` only. Callers (`results-framework-reporting.service.ts`) are unchanged — they keep reading `contributionsMap` by `indicator_id`, which already returns the correct values once the subquery is fixed.
- **Client modules touched:** none. The Reporting screen renders whatever the API returns; no frontend logic to change.
- **External integrations touched:** none.

### 2.2 Sequence / interaction diagram

```
[Reporting screen] GET (via getGlobalUnitsByProgram / getWorkPackagesByProgramAndArea)
  └── ResultsFrameworkReportingService
        └── AoWBilateralRepository.getIndicatorContributions(program, tocContext)
              ├── tgt subquery  — per-node target sums (unchanged, already correct)
              ├── act subquery  — FIXED: group/join by tri.id (node), not tri.toc_result_indicator_id (catalog)
              │     ├── actual_achieved_value_sum      = SUM(contributing_indicator) WHERE status IN (2,6)   [unchanged basis]
              │     ├── preliminary_achieved_value_sum  = SUM(contributing_indicator) WHERE status IN (3,6)   [unchanged basis]
              │     └── achieved_value_sum (NEW)        = SUM(contributing_indicator) WHERE status IN (2,3,6) [RFR-DD-2]
              └── contributionsMap keyed by indicator_id (tri.id) — values now correct, shape unchanged
```

## 3. Data Model Changes

None. No entity, no migration. This is a raw-SQL repository method; no TypeORM entity is touched.

### 3.1 / 3.2 / 3.3
Not applicable — no schema change.

## 4. API Surface

### 4.1 New / changed endpoints
No endpoint signature changes. The two consuming endpoints (`GET .../global-units`, `GET .../work-packages`) keep their existing request/response DTOs; only the numeric values inside `progressDetails` / indicator payloads become correct.

### 4.2 Bilateral / platform-report impact
None — this repository is not read by `/api/bilateral/*` or `/api/platform-report/*`.

## 5. Server Workflow / Business Rules

- **`RFR-DD-1` — Fix the join key, not the map shape.** `contributionsMap` is already keyed by `row.indicator_id` (`tri.id`) at the outer level (`aow-bilateral.repository.ts:932`), which is correct. The defect is entirely inside the `act` subquery: `GROUP BY tri.toc_result_indicator_id` becomes `GROUP BY tri.id` (carrying `tri.toc_result_indicator_id` through unaggregated, or dropping it from the SELECT list if unused downstream — confirm at implementation time whether any other column still needs it), and the outer join condition `act.toc_result_indicator_id = tgt.toc_result_indicator_id` becomes `act.indicator_id = tgt.indicator_id`. No other subquery (`tgt`) changes — it already groups correctly per node.

- **`RFR-DD-2` — "Achieved" is the union-of-statuses sum, not a time-switching computation.** A `result` row has exactly one current `status_id`; there is no need to track "was submitted, now QA'd" transitions in the query — the existing status column already encodes the current state. Add a third conditional-aggregation column to the same `act` subquery:
  ```
  achieved_value_sum = SUM(CASE WHEN r.status_id IN (2, 3, 6) THEN contributing_indicator ELSE 0 END)
  ```
  This is exactly the existing outer `WHERE r.status_id IN (2, 3, 6)` filter (line 908) turned into the display aggregate — no double counting is possible because each result contributes under its one current status, and a result cannot be `QualityAssessed` and `Submitted` at the same time. `mapIndicatorContributionRow` gains `achieved_value_sum` (and `achieved_progress_percentage`, via the existing `calculateProgressPercentage`/`formatProgressPercentage` helpers) alongside the existing `actual_achieved_value_sum`/`preliminary_achieved_value_sum` pair — both of which are **kept unchanged** for any other consumer relying on their current (QA'd-only / submitted-inclusive) semantics.
  - **Alternatives considered:** (a) compute a client-side "whichever is non-zero" fallback between the two existing figures — rejected, pushes business logic to the client and doesn't cleanly resolve the "no double count" question; (b) mutate `actual_achieved_value_sum`'s own status filter to `(2,3,6)` in place — rejected, it's a named, documented field (`P2-3296`/`P2-2841` — see the code comment at line 776-782) that other consumers may already rely on for its current QA'd-only meaning; adding a new field is additive and non-breaking.
  - **Consequence:** one new field on `ScopeBucketDto`-adjacent contribution row shape (additive) — callers that don't read it are unaffected; the Reporting screen's "Achieved" column switches to read the new field (confirm exact client field name/binding during implementation — out of scope for this backend-only design, flagged as a follow-up in §13 if the client needs a matching read-side change).
  - **This resolves `RFR-OQ-1`** (server-side, inside the same `act` subquery) **and `RFR-OQ-2`** (no double count is structurally guaranteed — single current status per result) from `requirements.md`.

- **Step 2.3 reversion challenge:** does this change remove/invert any already-shipped behavior? The `actual_achieved_value_sum` (QA'd-only) and `preliminary_achieved_value_sum` (submitted-inclusive) fields and their status-set semantics are **not changed** — only their grouping key is corrected, and their values become smaller/correct (no longer inflated by sibling nodes) for any indicator with more than one node sharing a catalog id. Any dashboard currently showing an inflated pooled sum will show a lower, correct number after the fix — this is the intended correction, not a regression, and is called out explicitly here so the review step (`/akili-execute`'s Reviewer, and the human at HITL) doesn't mistake "the numbers went down" for a new defect.

- Cite `docs/trd/trd.md` §"Results Framework Reporting" — no specific `W#` workflow id exists for this cross-cutting reporting read path; the closest documented flow is the AoW/ToC progress rollup path already covered by `toc-progress-rollup.spec.ts`.

## 6. Frontend Plan

Not applicable to this spec (backend-only fix; `contributionsMap`'s existing keys/shape are preserved). If the Reporting screen needs to bind to the new `achieved_value_sum` field to fully close Nicoleta's ask end-to-end, that is a small, separate client change — flagged as a follow-up in §13 rather than folded into this backend spec, per the proposal's Non-Goals (client wiring wasn't confirmed as in-scope by the failed-then-recovered visual reference, which only showed the *symptom*, not a client code path).

## 7. Security & Authorization

No change. The method sits behind the same JWT-protected `/api/results-framework-reporting/*` surface as before; no new input, no new role gate needed.

## 8. Performance & Capacity

- The fix adds one more `GROUP BY` column (`tri.id`) to an already-grouped subquery and one more conditional-aggregation `SUM(CASE ...)` — negligible cost, no new joins, no new table scans, same index usage as today.
- No change to result set cardinality risk — if anything, grouping by the more granular `tri.id` reduces the chance of unexpected row collapse.

## 9. Observability

No new logging needed. If desired, a one-line `Logger.debug` could confirm the corrected per-node count during rollout verification, but is not required by any requirement here.

## 10. Testing Plan (forward-looking)

- **Repository-level tests** (extend `aow-bilateral.repository.spec.ts`): mock/seed two ToC nodes sharing one catalog `toc_result_indicator_id`, each with distinct targets, and a result reported+submitted against only one node — assert the other node's sums stay `0`. This is the **mandatory Bug Mode regression test** (`RFR-AC-1`): red before the fix (both nodes show the pooled value), green after (only the reported-against node shows it).
- **Status-union test** (`RFR-AC-2`/`RFR-AC-3`): seed one result at `Submitted(3)`, assert `achieved_value_sum` includes it; move it to `QualityAssessed(2)`, assert it's still counted exactly once (not twice, not zero).
- **Non-regression test** (`RFR-AC-4`): a single-node (non-shared) indicator's existing values are unchanged before/after.
- Defect-class → gate mapping: the defect class here is **wrong SQL aggregation** (both the join-key pooling and the status-union gap) — a repository-level test hitting the real query (or a faithful in-memory equivalent) against seeded rows is the correct gate; no visual/UI gate is needed since this spec has no frontend surface.

## 11. Backwards Compatibility & Migration Plan

- No migration. No API contract break — `actual_achieved_value_sum`/`preliminary_achieved_value_sum` keep their existing meaning; `achieved_value_sum` is additive.
- No feature flag needed — this is a correctness fix with no meaningful "old behavior" worth preserving behind a flag (the old behavior is the bug).
- No data backfill — nothing stored is wrong.
- Communication: worth a heads-up to Nicoleta/PMU that previously-inflated Global Units roll-ups will show lower (correct) numbers after deploy — not a new bug.

## 12. Design Decisions (ADRs)

### `RFR-DD-1` — Group/join `act` by node-level `tri.id`, not catalog-level `toc_result_indicator_id`
- **Context:** Multiple ToC nodes (one per Center/Center-combination) can share the same catalog indicator text/id; the `act` subquery pooled all of them together.
- **Decision:** Group and join on `tri.id` (per-node), matching what `tgt` already does correctly.
- **Alternatives considered:** keep catalog-level pooling and add an explicit `centerId` filter parameter to callers (rejected — doesn't fix the default/no-filter case, more caller-side plumbing); compute per-node aggregation client-side (rejected — leaks other nodes' raw result data over the wire, duplicates logic).
- **Consequences:** Correct, smaller numbers for any previously-shared/inflated indicator; no shape change for callers.

### `RFR-DD-2` — "Achieved" is a union-of-current-status sum (2,3,6), added as a new field
- **Context:** Nicoleta's confirmed rule: Achieved must reflect submitted progress before QA ends, without a time-based "switch" mechanism (the DB has no history of status transitions in this query — only the current `status_id`).
- **Decision:** Add `achieved_value_sum = SUM(... WHERE status_id IN (2,3,6))` as a new, additive field alongside the two existing ones.
- **Alternatives considered:** client-side fallback logic between the two existing figures (rejected — pushes business logic to the client); mutate `actual_achieved_value_sum`'s own filter (rejected — breaking change to a documented, possibly-relied-upon field).
- **Consequences:** One new backend field; a follow-up client change may be needed to bind the Reporting screen's "Achieved" column to it (§13).

## 13. Open Gaps & Follow-ups

- **Follow-up (not in this spec's scope):** confirm whether the Angular client's Reporting screen needs a code change to read `achieved_value_sum` instead of (or alongside) whatever field it currently binds to for the "Achieved" column — the screenshots only prove the *symptom*, not which client field is wired to it. If the client already reads `actual_achieved_value_sum` directly for that column, a small follow-up client task is needed; file it separately once this backend fix lands and the screen is re-checked.
- **Follow-up (RFR-R-10, should):** grep-sweep `aow-bilateral.repository.ts` for any other query joining on `toc_result_indicator_id` (e.g. `findByCompositeCode`'s indicator enrichment) for the same catalog-vs-node defect; file separately if found, since it may be a distinct code path outside this spec's confirmed root cause.
- **Risk accepted:** the exact client wiring is unverified in this session (screenshots only, no code read for the client Reporting component) — flagged rather than guessed.

## 14. Budget (Step 2.4)

- **Expected tasks:** 2 (one repository SQL/type fix + regression tests, one optional grep-sweep follow-up filed as a note rather than a task in this spec).
- **Expected LOC:** ~40-70 (query changes + type updates + new test cases in `aow-bilateral.repository.spec.ts`).
- **Expected review rounds:** 1.
- Depth **Lite** confirmed appropriate — small, single-file backend fix with mandatory regression tests. No split recommended.

## Required cross-references

- `docs/specs/bugfix/indicator-achieved-value-per-center/requirements.md` (same folder).
- `docs/specs/bugfix/indicator-achieved-value-per-center/proposal.md` (confirmed root cause, screenshots analysis).
- `docs/trd/trd.md` §"Results Framework Reporting", §"Contribution To Indicators".
- `docs/prd.md` (ToC / Area of Work tracking — no specific `AC-#`, defect fix).
