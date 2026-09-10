# Bug Proposal — KPI counts do not reconcile across the Program shell

**Answer first:** the same program shows three different "KPI" universes on one screen — band cards **449**, Overview hero **352** (+7 +5 in its outcome chips = 364), Reporting table headers **388** (382 across the five AoW cards + 5 + 1 in the two bucket cards) — because each surface builds its own denominator. The band card is the wrong one: it counts the 7 cross-cutting Intermediate Outcomes **six times** (once per AoW + once in their own card), ignores the zero-target rule every other denominator applies, and moves when the user filters. The fix is one shared, deduplicated KPI partition that every surface reads from, so `band total = Σ hero rows + outcome chips = Σ table ratios`.

## 1. Document Control

| Field | Value |
|---|---|
| Type | **Bug** |
| Spec path | `bugfix/kpi-count-reconciliation` |
| Slug | `kpi-count-reconciliation` — derived from free-text argument (*"las cifras de los KPIs no cuadran"*) |
| Approval Mode | `gated` at proposal time → switched to `pre-approved` in `requirements.md` per standing user feedback (2026-09-02) |
| Module | `result-framework-reporting` (client only — `pages/dashboard-lab`) |
| Branch | `qa-development-2026` |
| Depends on | none |
| Parallel-safe | **no** — edits `dashboard-lab.component.ts` and `reporting-aow-table.component.ts`, both also touched by the active `changes/aow-filter-popover` |
| Supersedes | the "accepted divergence" clauses in archived `changes/mass-reporting-flow` MRF-R-7 §3 Out and `changes/overview-aow-progress-hero` DD-1 / DD-3 / DD-4 / C-5 / C-8 (see §9; full list in `requirements.md` §12) |
| Reported by | j.cadavid@cgiar.org, 2026-09-03, with three screenshots (`evidence/01..03`) |
| Model routing | T1 phase; session model (Fable 5.1) exceeds the registry's `opus` entry — registry entry flagged for update, no downgrade recommended |

## 2. Intent

Every KPI figure on the Program shell (Overview tab and Reporting tab) must describe the same universe of planned KPIs, count each KPI exactly once, and apply the zero-target rule identically — so a reader can add the parts and get the total.

## 3. Problem / Current Behavior

Program **SP01 · Breeding for Tomorrow**, default phase, no filters (screenshots 2026-09-03):

| Surface | Shows | Formula today | Code |
|---|---|---|---|
| Band card **Total KPIs** / **KPIs with evidence** | `449` · `2 of 449` | every row of `reportingGroups()` — both tiers, no dedupe, no zero-target rule, **post-filter** | `dashboard-lab.component.ts:2371` `plannedReportingSummaryStats` |
| Band popover *"M planned results"* | `449` | Σ `group.count` — same double count | `dashboard-lab.component.ts:1418` `bandPlannedResultsCount` |
| Overview hero rail | `2 of 352` | output tier only, zero-target excluded | `:1614` `overviewAowProgressRich` |
| Overview hero chips | `Intermediate outcomes 0/7` · `2030 outcomes 0/5` | bucket `count`, zero-target **not** excluded | `:1585` `overviewXcutProgress` |
| Reporting table AoW header | `AOW02 · 144 KPIs · 1 of 115` | both tiers **incl. cross-cut IOs**, zero-target excluded | `reporting-aow-table.component.ts` `ratioOf` → `reporting-burndown.ts:96` `buildRatio` |
| Reporting table bucket cards | `Intermediate 7 KPIs · 0 of 5` · `2030 5 KPIs · 0 of 1` | zero-target excluded | same |
| Hub "Where to report" rows | `AOW02 1/137` (output tier, **no** zero-target rule) | | `:1562` `overviewAowProgress` |

So on one screen AOW02 is `144`, `137`, `115` and `110` KPIs depending on where you look, and the Intermediate outcomes are `7` on the hero and `5` in the table.

## 4. Proposed Outcome

- One **program KPI partition** computed once and shared: `{ outputs, aowOwnedOutcomes, intermediateOutcomes, outcomes2030 }`, each KPI in exactly one bucket, with the zero-target rule (MRF-R-7) applied once.
- Band **Total KPIs** = counted KPIs of the whole partition (SP01 → **363**), with a `title` disclosing planned vs excluded (*"414 planned · excludes 51 zero-target KPIs"*); **KPIs with evidence** = reported over the same set. Both **unfiltered** (a total that moves when you type in a search box is not a total — the principle the table's `ratioOf` already applies to the Only-pending toggle; note its own denominator still follows the Type/Category filters, an existing behaviour this spec leaves untouched).
- Overview hero: AoW rows on **outputs + AoW-owned outcomes** (cross-cut IOs excluded — they live in the chips), chips with the zero-target rule → `Σ rows + chips = band total` (SP01: `357 + 5 + 1 = 363`).
- Reporting table: AoW header ratio excludes the cross-cutting IO rows from its denominator (they stay visible in the Outcomes band with the existing RES-R-3 tooltip and are counted in the Intermediate card) → `AOW02 · 1 of 110`, same as the hero.
- Hub rows and ToC-map AoW nodes (TCM-R-3 "must equal Progress by area of work") follow automatically by consuming the same rows.

## 5. Scope

| In | Out |
|---|---|
| New shared helper (`reporting-burndown.ts`, single-home rule) building the deduplicated partition from `indicatorsByAow()` + the two bucket ToCs, using the backend's group-level `is_aow` | Any server change |
| Rewire: `plannedReportingSummaryStats`, `bandPlannedResultsCount`, `overviewAowProgress`, `overviewAowProgressRich`, `overviewXcutProgress`, table `ratioBase`/`ratioOf` | The QA / PREL **achievement** figures (`115 of 144 indicators`) — server roll-up `toc-progress-rollup.ts`, a different metric (achievement coverage) with its own tooltip |
| Disclosure `title`s on band cards and chips (MRF precedent) | Visual redesign of any card |
| Regression tests (Bug Mode): fixture with cross-cut IOs in ≥2 AoWs, AoW-owned outcomes, zero-target KPIs in every bucket; assert the reconciliation identities and count-once | Filters semantics of the Reporting table (`reportingGroupsForTable` keeps MRF-R-1/R-2) |

## 6. Non-Goals

- Changing what "Reported" means (`achieved > 0`, MRF-R-6) or what "Complete" means.
- Reordering rows, changing colours, tokens or layout.
- Touching `/api/results-framework-reporting/*` payloads.

## 7. Affected Users, Systems, And Specs

- **Users:** program leads and PMU reading the Program shell (PRD **US-P1** phase-aware dashboard, **G1** completeness).
- **Code:** `dashboard-lab.component.ts` (7 computeds), `reporting-burndown.ts`, `reporting-aow-table.component.ts`, `reporting-program-band` (title), `program-overview` (chip title), `reporting-entry-hub` (row title), `dashboard-lab.toc-map.ts` (leaf rule + Program-level branch suppression) — refined in `design.md` §6.
- **Tests pinning today's numbers** (will need fixture updates, not deletions): `dashboard-lab.oah-rows.spec.ts`, `dashboard-lab.hub.spec.ts`, `dashboard-lab.scope.spec.ts`, `program-overview.oah-hero.spec.ts`, `reporting-aow-table.component.spec.ts`, `reporting-program-band.component.spec.ts`, ToC-map spec (TCM-R-3).
- **Specs:** supersedes the recorded divergences in archived `mass-reporting-flow` (MRF-R-7 §3 Out), `overview-aow-progress-hero` (DD-1, DD-3, C-5, C-8), `reporting-entry-hub` (REH-R-2 basis); builds on `results/intermediate-outcome-aow-visibility` RES-R-3 (`is_aow` mechanism, verified live).

## 8. Visual Reference

- Source: **User screenshots** (no Figma, no generated mockup — the fix changes numbers, not layout)
- Location: `docs/specs/bugfix/kpi-count-reconciliation/evidence/01-overview-hero-352.png`, `02-reporting-table-449.png`, `03-band-cards-449.png`
- Notes: the three screenshots are the three surfaces of §3 for SP01. No new screens.

## 9. Bug Diagnosis

### Observed Symptom
Same program, same phase, no filters: band says **449** KPIs, hero says **352** (364 with its chips), the table's five AoW headers sum to **382** (388 with the two bucket cards); per AoW the same area shows 144 / 137 / 115 / 110; the Intermediate outcomes show 7 on the hero and 5 in the table.

### Reproduction Steps
1. Open `/result-framework-reporting/entity-details/SP01` (Overview) → hero rail `2 of 352`, chips `0/7`, `0/5`.
2. Open the Reporting tab (`?tocView=aows`) → band `449 indicators · 2 of 449`; rows `1 of 24 · 1 of 115 · 0 of 99 · 0 of 66 · 0 of 78 · 0 of 5 · 0 of 1`.
3. Deterministic against the live API — `evidence/reconcile.browser.js` run in the authenticated Orca browser tab (`orca eval`) against `localhost:3400` on 2026-09-03 reproduces **exactly** 449 / 352 / 382 / 437 (`evidence/sp01-reconcile.json`).

### Root Cause (confirmed)

The API embeds every cross-cutting Intermediate Outcome (`is_aow: false`) in **every** AoW's `tocResultsOutcomes` *and* in the Intermediate Outcomes endpoint (by design — RES-R-3, SQL rule *"ToC nodes without a work package must appear under every AOW"*). The client never dedupes them, and three surfaces then apply three different filters on top:

| SP01 live data | AOW01 | AOW02 | AOW03 | AOW04 | AOW05 | IO card | 2030 card |
|---|---|---|---|---|---|---|---|
| Output KPIs (all / zero-target) | 22 / 4 | 137 / 27 | 95 / 2 | 66 / 5 | 72 / 2 | — | — |
| Outcome-tier rows in AoW payload | 8 | 7 | 13 | 7 | 10 | 7 | 5 |
| …of which **cross-cut IOs** (`is_aow:false`, same 7 ids in each) | 7 | 7 | 7 | 7 | 7 | 7 | 0 |
| …AoW-owned outcomes (`is_aow:true`) | 1 | 0 | 6 | 0 | 3 | — | — |

1. **Double counting (band):** `plannedReportingSummaryStats` and `bandPlannedResultsCount` flatten `reportingGroups()` → the 7 IO indicators contribute `5×7 + 7 = 42` rows for 7 KPIs. Unique KPIs are `392 + 10 + 7 + 5 = 414`, not 449.
2. **Zero-target rule applied inconsistently:** hero rail and table ratios exclude `target = 0 ∧ achieved = 0` (MRF-R-7); band cards and hero chips do not. 51 zero-target KPIs in SP01 (40 outputs, 5 owned outcomes, 2 IO, 4 for 2030) → counted universe **363**.
3. **Tier basis differs per surface:** hero rows = outputs only (OAH DD-3); table ratio = outputs + all outcome rows **including the cross-cut IOs** (AOW02 `115 = 110 + 5` counted IOs that are not AOW02's own); hub rows = outputs with no zero-target rule (137). AoW-owned outcomes (10 KPIs, 5 counted) appear in **no** hero figure at all.
4. **Band totals are filter-dependent:** `reportingGroups()` applies the AoW search (`plannedFilteredAows`), Section, Type and Category filters before the band reads it (`indicators: rows = tierRows.filter(matchTypology)`), so "Total KPIs" shrinks as the user filters — code-confirmed, contradicts the pinned "progress never moves with a filter" contract of `ratioOf`.

Causes 1, 2 and 4 make the band card (the surface the reporter pointed at) wrong on its own terms. Cause 3 is the reason the other two surfaces cannot be reconciled with it or with each other — it was consciously *recorded* as an accepted divergence (MRF-R-7 §3 Out, OAH DD-1/C-8) and this report is the product owner withdrawing that acceptance.

### Impact & Scope
- Every program with cross-cutting IOs over-reports its KPI total by `AoWs × IOs` (SP01: 5 × 7 = +35 — the 7 IOs appear in 5 AoW payloads plus their own card, i.e. six times). SP04, checked the same way, has no cross-cuts (`is_aow: true` everywhere) so its band only carries causes 2 and 4 — the defect is data-shaped, not constant.
- "KPIs with evidence" percentage is under-stated (denominator inflated).
- Hub "Where to report" and ToC-map AoW nodes inherit whichever basis they read; no data-integrity or security implication — display only.

### Fix Strategy
Logic and behaviour change across six computeds and a shared helper → **`/akili-specify` (Lite) in Bug Mode** with a mandatory regression test (red on today's code, green after): a `reporting-burndown` fixture with 2 AoWs sharing 3 cross-cut IOs, 1 owned outcome, zero-target KPIs in every bucket, asserting (a) each `indicator_id` counted once, (b) `band.total = Σ heroRows.total + Σ chips.total = Σ tableRatios.total`, (c) chips and band apply the zero-target rule, (d) band figures unchanged under Section/Type/Category/search filters. Not `/akili-quick`: nothing here is cosmetic.

## 10. Approach Options

| Option | What | Result for SP01 | Trade-off |
|---|---|---|---|
| **A — Shared partition (recommended)** | One helper builds the deduplicated, zero-target-filtered partition; band, hero rows, chips, table ratios, hub and ToC map all consume it. Hero rows gain the AoW-owned outcome tier; table ratios drop cross-cut rows from the denominator. | Band **363** = hero `357 + 5 + 1` = table `19+110+94+61+73 + 5 + 1`; AOW02 = **110** everywhere | Touches 7 test files' fixtures; supersedes two archived design decisions; ~1 day |
| B — Fix the band only | Dedupe + zero-target + unfiltered on `plannedReportingSummaryStats`/`bandPlannedResultsCount`; leave hero and table as they are | Band 363, hero 352 + 7 + 5 = 364, AOW02 still 110 vs 115 | Smallest diff, but the screen still does not add up — the reported symptom survives |
| C — Band adopts the hero's universe | Band = outputs only + chips (352 + 7 + 5) | Band 364; AoW-owned outcomes (10 KPIs) vanish from the total | Hides real planned KPIs; chips still ignore zero-target; table still 115 |

## 11. Recommended Approach

**Option A.** It is the only option under which the numbers reconcile, and it follows the pattern the codebase already trusts: the MRF spec fixed the same class of drift by moving `stateOf`/`applyZeroTargetRule`/`buildRatio` into one home and making every surface delegate — this extends that home with a partition step. The extra cost over B is fixture updates, not new UI.

Design guardrails for `/akili-specify`:
- Cross-cut detection uses the backend's group-level `is_aow` (already stamped as `__isIntermediateCrosscut` in `indicatorsByAow()`), never `indicator_id` cross-referencing against the IO endpoint (RES-R-3 verified rule).
- The IO card's own list remains the authority for the IO bucket; cross-cut rows inside AoW cards stay **visible** with their tooltip and simply stop feeding the AoW header ratio.
- "Reported" stays `achieved > 0`; the band's current `progress_percentage > 0 ||` clause is dropped (dead branch — the field is a percent string such as `'1500%'` observed live on SP01/AOW02, so `Number()` yields `NaN`).

## 12. Risks, Dependencies, And Open Questions

| Kind | Item |
|---|---|
| Risk | `changes/aow-filter-popover` (active, ungated) edits the same two files — sequence this spec after it or rebase its tasks; mark `Parallel-safe: no` honoured |
| Risk | Seven spec files pin today's numbers; fixtures must be updated to the new invariants, not loosened |
| Risk | The QA/PREL achievement box keeps showing `115 of 144 indicators` (server basis includes cross-cuts) next to a row that now says `1 of 110`; mitigated by its existing tooltip — **OQ-1** below |
| Dependency | none outside the client |
| OQ-1 | Should the server roll-up (`toc-progress-rollup.ts`, P2-3296) also exclude cross-cut IOs from each AoW's `indicators_total` so the achievement coverage matches the new row basis? Proposed: separate follow-up spec; out of scope here |
| OQ-2 | Hero AoW rows adopting AoW-owned outcomes changes OAH DD-3 ("output tier only"). Confirm with the owner that an AoW-owned Intermediate Outcome counts as that AoW's KPI (the table already treats it so) |
| OQ-3 | Band disclosure copy: `"414 planned · excludes 51 zero-target KPIs"` vs showing planned as the big number and counted in the subline — pick one at specify |

## 13. Success Criteria

- For any program and phase, with no filters: `Total KPIs = Σ hero AoW rows + Intermediate chip + 2030 chip = Σ Reporting table header ratios (AoW + bucket cards)`.
- Each `indicator_id` contributes to exactly one bucket of every total.
- Every denominator on the shell applies the zero-target rule and discloses it via `title` when N > 0.
- Band figures do not change under any Section / Type / Category / search filter or the Only-pending toggle.
- SP01 acceptance figures: band **363 (414 planned, 51 zero-target)**, `2 of 363` with evidence; AOW02 row **1 of 110** on hero and table; Intermediate **0 of 5**, 2030 **0 of 1** on both.
- Regression test red on `qa-development-2026` today, green after; existing OAH / MRF / REH / TCM suites green with updated fixtures.

## 14. Next Step

```text
/akili-specify bugfix/kpi-count-reconciliation
```

Run in **Bug Mode** — convert §9 into the fix plan plus the mandatory regression test described in *Fix Strategy*.
