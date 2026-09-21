# `bugfix/reported-results-center-scoping` — Requirements

**Depth:** Full (Bug Mode) · **Status:** draft · **Ticket(s):** none (reported by santiago.sanchez@cgiar.org, product decision by Ángel, 2026-09-21)

## 1. Module / Feature

- **Module:** `results-framework-reporting` + `results` (`api/results-framework-reporting/`, `api/results/results-toc-results/`), TRD §"Results Framework Reporting"
- **Sub-feature:** Combination-group isolation for shared ToC indicators — write-path capture of `toc_indicator_target_id` and its use across every read path that currently pools or cross-attributes contributions
- **Owner:** Backend (onecgiar-pr-server), minor client wiring (onecgiar-pr-client)
- **Status:** draft

## 2. Context

A ToC indicator can be split not by individual center, but by **combination of centers** — e.g. "Number of knowledge products on FAIR data and modeling tools" (SP02) has 5 groups: `CIMMYT` (target 5), `IITA` (target 1), `CIP, IITA` (target 1), `CIMMYT, IITA` (target 1), `Bioversity (Alliance), IITA` (target 2). Confirmed against live data (`proposal.md` §9, Juan David Delgado): for this indicator all 55 target rows (5 groups × 11 years) share the **identical** `related_node_id`, `toc_result_indicator_id` (uuid), and `toc_results_indicators.id` — **none of the three indicator-level identifiers distinguishes a group**. The only column that does is `toc_indicator_target_id` (on `toc_result_indicator_target`), an identifier already known to this codebase — it was introduced by a prior fix (P2-3255/P2-3257) inside `AoWBilateralRepository.findByCompositeCode`'s row-source query, which groups and returns it correctly per row.

**Confirmed business rule (Ángel, 2026-09-21):** every combination-group is a fully independent bucket. A result reported against `IITA` alone counts **only** toward the `IITA` row — never toward `CIMMYT, IITA`, `CIP, IITA`, or `Bioversity (Alliance), IITA`, even though all four include IITA. Symmetrically for every center. **No cross-attribution, no summation across groups sharing a center, ever.**

**Confirmed root cause:** `results_toc_result_indicators` — the table PRMS writes to when a result is linked to an indicator — has no column recording which `toc_indicator_target_id` the link was made against. It stores only the shared `toc_results_indicator_id`. Because that id is identical across all groups of a shared indicator, **the fact of which group a result belongs to was never captured at write time**, so every read path that needs to isolate one group from its siblings has nothing correct to filter on.

**Confirmed blast radius — two read paths broken, two intentionally different:**

| Consumer | Current isolation key | Correct? | User-visible surface |
|---|---|---|---|
| `findByCompositeCode` (row source for the Reporting table) | `trit.toc_indicator_target_id` (already fixed, P2-3255/P2-3257) | ✅ Yes — targets and center lists render correctly per row | Reporting table's Target column and center chips |
| `getIndicatorContributionsByCenter` + `sumContributionsForCenters` | `indicator_id` (shared `tri.id`) bucket, then **center-set intersection** (`centerIds.some(id => entry.centerIds.has(id))`) | ❌ No — a solo-`IITA` result's `centerIds = {IITA}` intersects `CIMMYT, IITA`'s row centers `[CIMMYT, IITA]`, so it is wrongly counted there too | Reporting table's **QA % / Prel %** columns per row — the most visible instance of this bug |
| `get-existing-result-contributors` (Reported results drawer panel) | `related_node_id` (shared, used as-is, no center/group logic at all) | ❌ No — the bug originally reported by the user | Indicator drawer's "Reported results" tab |
| `getIndicatorContributions` (`tgt` + `act` subqueries, node-level `tri.id` rollup) | `tri.id` only (shared across a node's combination-groups) | ⚠️ **Out of scope, believed correct-by-design** — its own docstring (`RFR-DD-1`, sibling spec) states the pooled node total is *intentionally* right for HLO/AoW/Program-level roll-ups (a program-wide "how much progress on this indicator, period" figure legitimately sums every combination-group's contribution). Ángel's rule was scoped to attribution between combination-groups, not to whether a portfolio-wide rollup should pool them — no confirmation was sought that pooling here is wrong, so this spec does **not** change it (see Non-Goals). If a future report shows this rollup is ALSO wrong, that needs its own confirmed diagnosis, not an assumption piggybacked on this fix. | Global Units / Work Packages-by-Area roll-ups (`getGlobalUnitsByProgram`, `getWorkPackagesByProgramAndArea`) |

Reference: `docs/prd.md` (ToC / Area of Work tracking, no specific `AC-#` — data-integrity defect in an existing capability). `docs/trd/trd.md` §"Results Framework Reporting". `docs/specs/bugfix/indicator-achieved-value-per-center/` (sibling spec whose fix this requirement supersedes for combination-group indicators — see §9 below).

## 3. In Scope / Out of Scope

### In scope

- **Write path:** persist the exact `toc_indicator_target_id` a result was linked against, at the moment the link is created (`FrameworkResultTocIndicatorsService.upsertTocIndicators` / `_upsertIndicatorTargetRecord`), via a new nullable column on `result_indicators_targets`.
- **Migration:** add the new column; TypeORM entity update; no backfill of historical rows required at ship time (see §9 — historical rows fall back to today's behavior, explicitly, not silently).
- **Client wiring:** the Reporting table / indicator drawer already receives `toc_indicator_target_id` per row from `findByCompositeCode` (`TocResultRow.toc_indicator_target_id`, already correctly populated) — thread that value through `manageIndicator(row, hlo, tab, node)` → indicator-drawer → the create-result payload, so the server has it to persist.
- **Read path fix 1 (original bug):** `existing-result-contributors-loader.service.ts` filters by the new `toc_indicator_target_id` when present, instead of `related_node_id` alone.
- **Read path fix 2:** `getIndicatorContributionsByCenter` + `sumContributionsForCenters` switch from center-set intersection to an exact `toc_indicator_target_id` match, once available.
- Regression tests for both read paths plus the write path, proving group isolation with zero cross-attribution.

### Out of scope

- Redesigning how ToC master data splits an indicator into combination-groups — that structure is given, not something PRMS controls.
- Historical backfill of pre-fix `results_toc_result_indicators`/`result_indicators_targets` rows to populate the new column (accepted gap — see §9, Open Questions, and Non-Functional Requirements).
- Any change to `findByCompositeCode`'s existing `toc_indicator_target_id` grouping — already correct, untouched.
- **`getIndicatorContributions` (`tgt`/`act` subqueries, the Global Units / Work Packages-by-Area rollup)** — its node-level pooling across combination-groups is believed correct-by-design (see the blast-radius table above); not touched by this spec. If it later proves wrong, that is a separate, separately-confirmed spec.
- Any change to the union-of-status formula (`status_id IN (2,3,6)`) that computes `achieved_value_sum` — untouched.
- Indicators that are NOT combination-group-shaped (single node per center, or single node overall) — these already work correctly today and MUST remain unchanged (regression-guarded, not redesigned).

## 4. Personas Affected

| Persona | What changes for them |
|---|---|
| Center reporting user | Reporting a result against one specific combination-group affects only that group's Achieved/Prel figures on the Reporting table and its Reported-results list — never a sibling group that happens to share a center. |
| QA reviewer | Reported results panel per row shows only what was actually reported against that exact group. |
| PMU / Program lead (Global Units, roll-ups) | Unaffected by this spec — the rollup's pooled-by-node behavior is unchanged (see Non-Goals). |

## 5. User Stories

- **`RRC-US-1`** — As a Center reporting user, I want a result I report against one specific center combination to count only for that combination, so that sibling combinations sharing a center are never inflated or falsely credited.
- **`RRC-US-2`** — As a Center reporting user, I want the "Reported results" panel to show only results actually linked to the exact row I opened it from, so that I can trust what I see there.
- **`RRC-US-3`** — As a QA reviewer, I want the Reporting table's QA%/Prel% columns to reflect only the exact combination-group each row represents, so a shared center's activity elsewhere never inflates a row it wasn't reported against.

## 6. Functional Requirements

### Required (MUST)

- **`RRC-R-1`** When a result is linked to a ToC indicator via the create/framework flow, the system MUST persist the exact `toc_indicator_target_id` of the combination-group the client reported against, on the new column added to `result_indicators_targets`.
- **`RRC-R-2`** The system MUST treat every `toc_indicator_target_id` as a fully isolated bucket: a result linked to one group MUST NOT be counted, summed, or listed under any other group, even when the groups share one or more centers.
- **`RRC-R-3`** `ExistingResultContributorsLoaderService.loadContributions` MUST filter by the reported result's persisted `toc_indicator_target_id` (when present) in addition to the existing `related_node_id`/`toc_results_indicator_id` narrowing, so the Reported results panel only lists results actually linked to the exact group the panel was opened for.
- **`RRC-R-4`** `AoWBilateralRepository.getIndicatorContributionsByCenter` and `sumContributionsForCenters` MUST stop using center-set intersection as the isolation mechanism and MUST match on the exact `toc_indicator_target_id` instead, once results carry it.
- **`RRC-R-6`** Neither `RRC-R-3` nor `RRC-R-4` MAY change the existing status-set/union-of-status aggregation formulas established by `bugfix/indicator-achieved-value-per-center` (`RFR-DD-2`) — only the grouping/isolation key changes. `getIndicatorContributions` (the Global Units / Work Packages rollup, `RFR-DD-1`'s node-level grouping) is explicitly untouched — see Non-Goals.
- **`RRC-R-7`** For any indicator whose ToC nodes do NOT share `related_node_id`/`toc_result_indicator_id`/`tri.id` across combination-groups (i.e., today's already-correct case, most SP01 indicators per `proposal.md` §12), the system MUST produce unchanged output before and after this fix (regression-safe).
- **`RRC-R-8`** A `results_toc_result_indicators`/`result_indicators_targets` row created **before** this fix ships (no `toc_indicator_target_id` persisted) MUST continue to be read exactly as it behaves today (existing fallback, not a hard error) — an explicit, acknowledged gap, not a silent behavior change for historical data (see Non-Functional Requirements, Backwards compatibility).

### Should (SHOULD)

- **`RRC-R-10`** The client (Reporting table → indicator drawer → create-result payload) SHOULD forward the row's already-known `toc_indicator_target_id` (present today in `TocResultRow.toc_indicator_target_id` from `findByCompositeCode`) end to end, so `RRC-R-1` has a value to persist for every newly created link, not only ones a future client change enables.

## 7. Non-Functional Requirements

| Dimension | Target |
|---|---|
| **Correctness** | Zero cross-attribution between combination-groups sharing a center, for both new and (where the anchor is present) legacy data — verified by tests, not by inspection. |
| **Backwards compatibility** | Existing single-node / single-center indicators (the majority) MUST show unchanged values. Historical rows without the new column populated MUST NOT error or silently disappear — see `RRC-R-8`. |
| **Data integrity** | The new column is additive (`nullable`); no existing column semantics change; migration MUST have a working `down`. |
| **Observability** | No new logging required beyond existing patterns; no secrets involved. |

## 7a. Defect Classes & Verification Gates

| Defect class this spec can produce | Gate that catches it |
|---|---|
| Write path never captures `toc_indicator_target_id` (silently continues today's bug) | Integration/unit test on `FrameworkResultTocIndicatorsService` asserting the new column is populated when the client supplies the value (`RRC-AC-1`). |
| Cross-attribution across groups sharing a center persists in either of the 2 read paths | Repository-level Jest tests per path, seeding two combination-groups sharing one center and one result reported against only one of them — asserting the sibling group stays at zero (`RRC-AC-2`, `RRC-AC-3`). No automated check can catch this by reading the query text alone — must run against seeded rows, per the project's standing rule to verify SQL fixes against real data shape. |
| Regression on already-correct, non-shared indicators | Repository-level Jest test per touched query asserting unchanged output for a single-node/single-center case (`RRC-AC-5`). |
| Historical rows silently misbehaving (erroring or vanishing) once the new column is read | Test seeding a pre-fix row (no `toc_indicator_target_id`) and asserting the existing (imperfect but non-crashing) fallback behavior is preserved (`RRC-AC-6`). |
| Client never sends the new field, so `RRC-R-1` has nothing to persist for real users | Client unit/component test asserting the create payload includes `toc_indicator_target_id` when the row carries one (`RRC-AC-7`) — flagged as a SHOULD-level gap if client wiring is deferred past this spec's first PR (see Open Questions). |

No visual/UI-design defect class applies beyond the client payload-wiring check above — no new screens, no new components; this is a data-plumbing fix through existing surfaces.

## 8. Acceptance Criteria

| ID | Given | When | Then |
|---|---|---|---|
| `RRC-AC-1` | A result is created against a specific combination-group row (client sends `toc_indicator_target_id`) | The link is persisted via `FrameworkResultTocIndicatorsService` | `result_indicators_targets`'s new column stores that exact `toc_indicator_target_id`. |
| `RRC-AC-2` | Two combination-groups share center `IITA` (`IITA` alone, target 1; `CIMMYT, IITA`, target 1) and a result is reported+submitted only against the `IITA`-alone group | The indicator drawer's Reported results panel is opened for the `CIMMYT, IITA` group | The result does NOT appear in that panel (only in `IITA`-alone's panel). |
| `RRC-AC-3` | Same seed as `RRC-AC-2` | `getIndicatorContributionsByCenter`/`sumContributionsForCenters` compute the Reporting table's QA%/Prel% for both rows | The `CIMMYT, IITA` row shows `0` contribution from that result; the `IITA`-alone row shows it counted once. |
| `RRC-AC-5` | A single-node, non-shared indicator with an existing reported result | Either of the two fixed queries is run before and after the fix | Output is unchanged. |
| `RRC-AC-6` | A `results_toc_result_indicators`/`result_indicators_targets` row created before this fix (no `toc_indicator_target_id` stored) | Either of the two fixed read paths runs against it | The row is still returned/counted per today's existing (documented, imperfect) behavior — no error, no silent disappearance. |
| `RRC-AC-7` | A user opens the "Report" action from a specific Reporting-table row that carries `toc_indicator_target_id` | The create-result payload is sent to the server | The payload includes that `toc_indicator_target_id`. |

Cross-cutting project ACs that already apply (not restated): `AC-1` Typed result integrity, `AC-5` Phase / versioning correctness.

## 9. Dependencies & Assumptions

### Upstream dependencies

- `toc_results_indicators`, `toc_result_indicator_target`, `toc_result_indicator_target_center` (ToC-side, `DB_TOC`, read-only from PRMS).
- `results_toc_result_indicators`, `result_indicators_targets` (PRMS-side, `DB_NAME` — `result_indicators_targets` gains the new column).
- Supersedes, for combination-group indicators only, the grouping key chosen by `bugfix/indicator-achieved-value-per-center`'s `RFR-DD-1` (node-level `tri.id`) — that decision remains correct for non-shared and single-node-per-center indicators; this spec adds the finer-grained key on top, it does not revert the union-of-status formula (`RFR-DD-2`), which is explicitly kept (`RRC-R-6`).

### Downstream consumers

- `ResultsFrameworkReportingService.getGlobalUnitsByProgram`, `getWorkPackagesByProgramAndArea` (via `getIndicatorContributions`).
- Reporting table's QA%/Prel% rendering (via `getIndicatorContributionsByCenter` → `fetchAndGroupTocResults` → `findByCompositeCode`).
- Indicator drawer's Reported results tab (via `GET_ExistingResultsContributors`).

### Assumptions

- `TocResultRow.toc_indicator_target_id` is already correctly populated per row by `findByCompositeCode` (confirmed by code read, P2-3255/P2-3257) — the client-side gap is only in *forwarding* it through the create flow, not in the server having it available to send.
- The exact client component(s)/payload field(s) that need to carry `toc_indicator_target_id` from row-click to create-submission require confirmation during design/execution (dashboard-lab → indicator-drawer → lab-report-form chain) — not fully traced in this requirements pass.

## 10. Open Questions

- **`RRC-OQ-1`** Historical data: is a one-time backfill migration (using the position-based `number_target`+`target_date` anchor Juan David identified, applied once, not as a runtime dependency) worth doing in this spec, or deferred as a separate follow-up once the new column ships and its real-world null-rate is known? **Recommendation for design.md: defer — ship the column and forward-fix first, decide backfill after measuring how many historical rows are actually ambiguous.**
  - **Status:** RESOLVED (santiago.sanchez@cgiar.org, 2026-09-21) — **no backfill, in this spec or as an automatic follow-up.** Juan David Delgado independently raised the same concern ("ahí toca tener presente qué va a pasar con las contribuciones que ya están. Si toca hacer algún backfill"), and the risk was assessed: the only available anchor (`number_target`+`target_date`) is positional, unverifiable against ToC's reorder history, and a wrong backfill would be silently *worse* than today's known `NULL` fallback — it would make the exact-match read paths trust a wrong group with full confidence, producing a new, harder-to-detect defect instead of the current, well-understood one. Historical rows stay `NULL` and keep today's exact existing behavior indefinitely, per `RRC-R-8`. If a future need for historical correctness arises, it requires its own separately-scoped, manually-verified effort — never an automated positional backfill.
- **`RRC-OQ-2`** Should client wiring (`RRC-R-10`, `RRC-AC-7`) ship in the same PR as the backend column + read-path fixes, or as a fast-follow PR? Affects whether newly-created results are correctly isolated from day one of this spec's deploy, or only once the client change also ships.

## 11. Out-of-Band Notes

This spec's root cause and business-rule confirmation are recorded in `proposal.md` (§9 Bug Diagnosis, updated 2026-09-21 with Ángel's answer) — that document is the source of truth for the diagnosis narrative; this file converts it into testable requirements.

## Required cross-references

- `docs/prd.md` — ToC / Area of Work tracking; no specific `AC-#` — defect fix, not a new capability.
- `docs/trd/trd.md` — §"Results Framework Reporting".
- `docs/specs/bugfix/reported-results-center-scoping/proposal.md` — confirmed root cause, Ángel's product decision (source of truth for this spec).
- `docs/specs/bugfix/indicator-achieved-value-per-center/` — sibling spec this one extends for combination-group indicators (does not revert its `RFR-DD-2` union-of-status formula).
