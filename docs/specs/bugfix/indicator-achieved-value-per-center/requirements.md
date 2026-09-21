# `bugfix/indicator-achieved-value-per-center` — Requirements

**Depth:** Lite (Bug Mode) · **Status:** draft · **Ticket(s):** none (reported by Nicoleta Trifa via email, 2026-09-18)

## 1. Module / Feature

- **Module:** `results-framework-reporting` (`api/results-framework-reporting/`, TRD §"Results Framework Reporting")
- **Sub-feature:** ToC indicator achieved/preliminary value aggregation (`AoWBilateralRepository.getIndicatorContributions`)
- **Owner:** Backend (onecgiar-pr-server)
- **Status:** draft

## 2. Context

The Reporting screen (`Sustainable Farming (SP02) → Reporting`) lists ToC result nodes grouped by Area of Work, each showing Target, Achieved, `QA %`, and `Prel %` for its indicators. When a catalog indicator (e.g. "Number of knowledge products on FAIR data and modeling tools") is reused across several ToC nodes — each node tagged to a different Center or Center-combination, each with its own Target — every node currently displays an **identical, pooled** Achieved/Prel figure instead of its own. Confirmed root cause (see `proposal.md` §3): `AoWBilateralRepository.getIndicatorContributions()`'s `act` subquery groups and joins on the **catalog-level** `tri.toc_result_indicator_id` instead of the **node-level** `tri.id`, so one node's reported contribution is copied onto every sibling node sharing the same indicator text.

Separately, Nicoleta Trifa (report author) confirmed a second, coupled business rule: the "Achieved" figure must reflect **submitted** contributions (not only QA'd/Approved ones) until QA concludes for that contribution — today it is computed strictly from QA'd/Approved status (`2, 6`) and sits at `0` even after a KP is submitted.

Reference: `docs/prd.md` (ToC / Area of Work tracking, no specific `AC-#` for indicator-aggregation correctness — this is a data-integrity defect in an existing capability, not a new PRD goal). `docs/trd/trd.md` §"Results Framework Reporting" / `api/contribution-to-indicators`.

## 3. In Scope / Out of Scope

### In scope
- Fixing the `GROUP BY` / join key in `getIndicatorContributions`'s `act` subquery so achieved/preliminary sums are computed per ToC node (`tri.id`), not per shared catalog indicator id.
- Making the "Achieved" figure reflect submitted-basis progress before QA completes, per the confirmed business rule, without double-counting once a contribution is QA'd.
- Regression tests proving per-node isolation and the submitted-until-QA'd behavior.

### Out of scope
- Changing the aggregation basis from SUM(`contributing_indicator`) to a count of results.
- Any change to indicator **targets** (`tgt` subquery, `toc_result_indicator_target`) — already correctly grouped per node.
- Data migration — no stored values are wrong.
- Redesigning how ToC master data splits one indicator into multiple Center-tagged nodes.
- Any UI/frontend change beyond consuming corrected values already shaped the same way (`contributionsMap` keyed by `indicator_id`, no shape change expected).

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Center reporting user | Sees Achieved/Prel figures reflecting only their own Center's/node's reported results, and sees submitted progress before QA finishes. |
| PMU / Program lead (Global Units, roll-ups) | AoW/unit-level roll-ups (`getGlobalUnitsByProgram`) stop double-counting sibling-node contributions. |

## 5. User Stories

- **`RFR-US-1`** — As a Center reporting user, I want my indicator's Achieved/Preliminary values to reflect only results reported against my Center's ToC node, so that I am not shown (or credited/blamed for) another Center's activity on a shared indicator.
- **`RFR-US-2`** — As a Center reporting user, I want a submitted-but-not-yet-QA'd contribution to count toward "Achieved" immediately, so that my reported progress is visible before the QA process concludes.

## 6. Functional Requirements

### Required (MUST)

- **`RFR-R-1`** The system MUST compute `actual_achieved_value_sum` and `preliminary_achieved_value_sum` per ToC result node (keyed by the node-specific indicator id, `tri.id`), not pooled across every node sharing the same catalog indicator id.
- **`RFR-R-2`** When a result is reported against ToC node A, and node B shares the same catalog indicator text/id as A but has no results reported against it, the system MUST show node B's Achieved and Preliminary % as `0`/`0%` — unaffected by node A's activity.
- **`RFR-R-3`** The system MUST compute the "Achieved" figure returned to callers as the submitted-basis sum (status `Submitted (3)` / `Approved (6)`) for any contribution that has not yet reached QA'd status, falling back to the QA'd-basis sum (status `QualityAssessed (2)` / `Approved (6)`) once QA'd status supersedes the submission — without double-counting a single contribution under both bases simultaneously.
- **`RFR-R-4`** `getGlobalUnitsByProgram` and `getWorkPackagesByProgramAndArea` MUST continue to read `contributionsMap` with no shape change (still keyed by `indicator_id`) — only the underlying values change.

### Should (SHOULD)

- **`RFR-R-10`** The fix SHOULD be verified against any other query in `aow-bilateral.repository.ts` that joins on `toc_result_indicator_id` (e.g. `findByCompositeCode`'s indicator enrichment), to confirm no sibling query shares the identical catalog-vs-node defect; any additional finding SHOULD be filed as a follow-up rather than folded into this fix if it's a separate code path.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Correctness** | No stored data is touched — this is a read-side aggregation fix; existing single-node (non-shared) indicators MUST show unchanged values (regression-safe). |
| **Backwards compatibility** | `contributionsMap`'s key shape (`indicator_id`) and the response shape of `getGlobalUnitsByProgram` / `getWorkPackagesByProgramAndArea` MUST NOT change. |
| **Observability** | No new logging required beyond existing `Logger` usage in the touched service; no secrets involved. |

## 7a. Defect Classes & Verification Gates

| Defect class this spec can produce | Gate that catches it |
|---|---|
| Wrong SQL `GROUP BY`/join key (values pooled across sibling nodes instead of isolated per node) | Repository-level Jest test seeding two sibling nodes + one reported result, asserting the non-reported node stays at `0` (`RFR-AC-1`). No automated check can catch this by reading the query text alone — it must run against seeded rows. |
| Wrong status-set basis for the new "Achieved" aggregate (double count, or missed submitted-but-not-QA'd contributions) | Repository-level Jest test moving one result through `status 3 → 2` and asserting the union sum stays single-counted (`RFR-AC-2`/`RFR-AC-3`). |
| Regression to existing (non-shared) indicators' values | Repository-level Jest test on a single-node indicator asserting unchanged output (`RFR-AC-4`). |
| Caller-side shape break (`getGlobalUnitsByProgram`/`getWorkPackagesByProgramAndArea`) | Existing service-level spec suites (`results-framework-reporting.service.spec.ts`) re-run as a regression guard — no new cases expected unless they assert on raw seeded numbers. |

No UI/visual defect class applies — this spec has no frontend surface (see `design.md` §6); the only follow-up (client field binding) is explicitly out of scope and filed separately, not silently assumed covered.

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `RFR-AC-1` | Two ToC nodes (A: Target 5, no Center-combo overlap; B: Target 1) share the same catalog indicator text/id, and one result is reported+submitted against node A with `contributing_indicator = 1` | `getIndicatorContributions` is called for the program | Node A's `preliminary_achieved_value_sum = 1` (Prel % = 20%); node B's `preliminary_achieved_value_sum = 0` (Prel % = 0%). |
| `RFR-AC-2` | A result is reported+submitted (status `3`) against a node, not yet QA'd | `getIndicatorContributions` is called | The node's "Achieved" figure reflects the submitted contribution (non-zero), not `0`. |
| `RFR-AC-3` | The same result is later approved/QA'd (status `2` or `6`) | `getIndicatorContributions` is called again | The node's "Achieved" figure reflects the QA'd-basis sum, with the contribution counted exactly once (no double count vs. the submitted-basis figure). |
| `RFR-AC-4` | A single-Center indicator (no sibling nodes sharing its catalog id) with an existing reported result | `getIndicatorContributions` is called before and after the fix | The value is unchanged (regression-safe for the non-shared case). |

Cross-cutting project ACs that already apply (not restated): `AC-1` Typed result integrity, `AC-5` Phase / versioning correctness.

## 9. Dependencies & Assumptions

### Upstream dependencies
- `toc_results_indicators`, `toc_result_indicator_target`, `results_toc_result`, `results_toc_result_indicators`, `result_indicators_targets` (all within `onecgiar-pr-server`'s existing schema — no new tables).

### Downstream consumers
- `ResultsFrameworkReportingService.getGlobalUnitsByProgram` (Global Units dashboard roll-ups).
- `ResultsFrameworkReportingService.getWorkPackagesByProgramAndArea` (indicator enrichment via `findByCompositeCode`).

### Assumptions
- `tri.id` (node-specific indicator row id) is reliably resolvable inside the `act` subquery for every reported result via the existing join chain (`results_toc_result.toc_result_id = tr.id` → `tri.toc_results_id = tr.id`) — confirmed true by reading the current query (§3 of `proposal.md`).
- The exact submitted-until-QA'd formula (whether a still-submitted result on the same node keeps contributing once a sibling result on that node is QA'd) needs one confirming example from Nicoleta/PO before implementation — see Open Questions.

## 10. Open Questions

- **`RFR-OQ-1`** Should the submitted-until-QA'd fallback be computed server-side in the SQL (e.g. `COALESCE`/`CASE` combining both bases into one "Achieved" figure), or is "Achieved" purely a client-side choice between the two already-returned figures (`actual_achieved_value_sum` vs `preliminary_achieved_value_sum`)? **Blocks `design.md`.**
- **`RFR-OQ-2`** When a node has multiple reported results against the same indicator, some QA'd and some still only submitted, does "Achieved" show QA'd-sum + still-pending-submitted-sum (a running total), or does it fully switch to QA'd-only the moment ANY result on that node is QA'd? **Blocks `design.md`.**

## 11. Out-of-Band Notes

None.

## Required cross-references

- `docs/prd.md` — ToC / Area of Work tracking (portfolio architecture section); no specific `AC-#` — this is a defect fix, not a new capability.
- `docs/trd/trd.md` — §"Results Framework Reporting" (`api/results-framework-reporting/`), §"Contribution To Indicators" (`api/contribution-to-indicators/`).
- `docs/specs/bugfix/indicator-achieved-value-per-center/proposal.md` — confirmed root cause and reproduction (source of truth for this spec).
