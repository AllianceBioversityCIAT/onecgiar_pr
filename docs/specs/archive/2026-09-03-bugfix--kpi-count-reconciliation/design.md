# Design — KPI Count Reconciliation (`bugfix/kpi-count-reconciliation`)

**Answer first:** add one pure helper, `partitionProgramKpis`, to `reporting-burndown.ts` (the file that already single-homes `stateOf` / `applyZeroTargetRule` / `buildRatio`), expose it through one new `computed` on `DashboardLabComponent`, and make the seven existing consumers read that computed instead of re-deriving their own basis. No API, no new component, no layout change — only which rows feed which denominator, plus `title` disclosures.

## Document Control

| Field | Value |
|---|---|
| Linked requirements | `requirements.md` (same folder) — KCR-R-1..R-10, KCR-AC-1..7 |
| Depth | Standard (Bug Mode) — re-sized in §14 |
| Approval Mode | `pre-approved` (inherited) — Phase 2 gate: *auto-approved (pre-approved mode)*; reversion challenge §12 run inline; judgment-day one pass (§15) |
| Skills | `angular-developer` (signals/computed), `tdd` (helper + regression tests) |
| Budget | 5 tasks · ~300 LOC (≈110 src / ≈190 test) · ≤ 1 Reviewer round per task — see §14 |
| Judgment-day | one pass run 2026-09-03 — 6 severe confirmed by both judges, all applied; ledger `judgment.md` |

## 1. Summary

The shell's KPI figures diverge because each surface builds its own indicator basis from `indicatorsByAow()` / `reportingGroups()`. This design introduces a single **partition** — `{ aows: [{ code, name, own[], crosscut, loading }], aowByCode, intermediate: { indicators, loading }, outcomes2030: { indicators, loading } }` — computed once per program + phase from the already-cached ToCs, and derives every total, ratio and chip from it with the existing `buildRatio`. The accepted trade-off: the hero's AoW rows change basis from "output tier only" to "AoW-own" (outputs + `is_aow: true` outcomes), superseding OAH DD-3, so that AoW rows agree with the grouped table and the ToC map.

## 2. Architecture Overview

### 2.1 Where this lives
- **Client modules touched:** `pages/result-framework-reporting/pages/dashboard-lab/` — `reporting-burndown.ts`, `dashboard-lab.component.ts`, `dashboard-lab.toc-map.ts`, `components/reporting-program-band/*`, `components/reporting-aow-table/*` (`ratioBase` + one DOM test), `components/program-overview/*` (chip `title`, comment), `components/reporting-entry-hub/*` (row `title`).
- **Server / external:** none.

### 2.2 Data flow (after)

```
tocByKey (per program::version)        aows()
  ├─ AoW ToCs  ─┐                         │
  ├─ IO ToC    ─┼─► indicatorsByAow() ────┤   (unchanged: stamps __tier, __isIntermediateCrosscut)
  └─ 2030 ToC  ─┘                         ▼
                                programKpiPartition()  ◄── NEW computed, calls partitionProgramKpis()
                                          │  { aows[{code,name,own[],crosscut,loading}], aowByCode, intermediate{indicators,loading}, outcomes2030{…} }
        ┌─────────────┬───────────────────┼──────────────────┬──────────────────┬───────────────┐
        ▼             ▼                   ▼                  ▼                  ▼               ▼
 plannedReporting  overviewAow      overviewAow        overviewXcut      plannedAowBanner   tocMapModel
 SummaryStats      Progress (thin)  ProgressRich       Progress (chips)  (By-AOW banner)    (AoW node)
 + bandPlanned     → hub rows,      → hero rows/rail                                        via TCM leaf
 ResultsCount      badge, tcm                                                               zero-target rule
                                 reportingGroups() ── aow cards: count = own.length; rows unchanged
                                 reporting-aow-table.ratioBase() ── drops __isIntermediateCrosscut rows
```

Every arrow on the bottom row ends in `buildRatio()` / `applyZeroTargetRule()` / `stateOf()` — no surface computes a denominator by hand.

## 3. Data Model Changes

None (client-only, no persistence).

## 4. API Surface

None. Payload fields relied upon (already present): `tocResultsOutputs[]`, `tocResultsOutcomes[].is_aow`, `indicators[].indicator_id | target_value_sum | actual_achieved_value_sum`.

## 5. Server Workflow / Business Rules

Not applicable.

## 6. Frontend Plan

### 6.1 Shared helper — `reporting-burndown.ts`
- **`partitionProgramKpis(bundles, intermediate, outcomes2030)`** → `ProgramKpiPartition`.
  - Input: the `indicatorsByAow()` bundles (`{ aow, indicators, loading }`) and the two bucket ToCs' flattened indicators (the host already flattens buckets via `flattenBucketIndicators`).
  - Rule (KCR-R-1/1.1): an AoW row is **own** iff `__tier !== 'outcome'` **or** `__isIntermediateCrosscut !== true`; otherwise it is a cross-cut and only increments `crosscut` (kept for the disclosure/tests). Bucket lists pass through, deduped by `indicator_id` within the bucket.
  - Output: `aows: [{ code, name, own, crosscut, loading }]` **plus** `aowByCode: Map<code, that entry>` (consumers that resolve by code — banner, table — use the map, never index the array); buckets: `intermediate: { indicators, loading }`, `outcomes2030: { indicators, loading }` (loading = bucket ToC not yet cached, same predicate `reportingGroups` uses today).
- **`summarisePartition(partition)`** → `{ planned, zeroTarget, counted, reported }` for the whole program, using `applyZeroTargetRule` + `achievedOf` (KCR-R-2, R-8, R-9). Pure, unit-tested with the requirements fixture.
- Both are pure functions — the single-home rule from MRF applies: no consumer re-implements the predicate.

### 6.2 Host computeds — `dashboard-lab.component.ts`

| Computed | Change | Requirement |
|---|---|---|
| **`programKpiPartition`** (new) | `partitionProgramKpis(indicatorsByAow(), ioFlat, o30Flat)` where the bucket ToCs are read from `tocByKey()` under `INTERMEDIATE_OUTCOMES_CODE` / `OUTCOMES_2030_CODE` (same keys `reportingGroups` uses) — **unfiltered** by construction | R-1, R-4 |
| `plannedReportingSummaryStats` | reads `summarisePartition(programKpiPartition())`; emits `{ programsCount, aowsCount, totalKpis: counted, reportedKpis: reported, plannedKpis: planned, zeroTargetKpis: zeroTarget }`; drop `progress_percentage` clause | R-4, R-8, R-9 |
| `plannedReportingStatsLoading` | unchanged semantics (`loadingAows() || any AoW entry loading || either bucket loading`) — read from the partition's per-AoW and per-bucket `loading` flags, not `reportingGroups()` | — |
| `bandPlannedResultsCount` | `summarisePartition(...).planned`, fallback chain unchanged for the pre-ToC state | R-8 |
| `overviewAowProgress` (thin) | per AoW: `buildRatio(own)` → `{ done, total, zeroTarget }` (was: outputs, no zero-target). Sort unchanged. **Side effect (intended, KCR-DD-2):** `program-overview.aowStats` (KPI card 4 / section badge) and hub rows consume this row → SP01 card 4 moves 392 → 357; supersedes OAH DD-4 | R-2, R-5 |
| `overviewAowProgressRich` | basis `own` instead of `__tier !== 'outcome'`; everything else unchanged | R-5 |
| `overviewXcutProgress` | per bucket: `buildRatio(bucket.indicators)` → `{ done, total: counted, zeroTarget }`; row kept iff `planned > 0`. `OverviewAowProgressRow` (host) gains optional `zeroTarget` | R-2, R-6 |
| `plannedAowBanner` | feeds `buildAowBannerStats` with `partition.aowByCode.get(code)?.own ?? []` instead of all indicators | R-5 |
| `reportingGroups` | `aow` cards: `count = own.length` (post-Type filter tier selection still applies to `indicators`); IO/2030 cards unchanged | R-10 |

### 6.3 Components
- **`reporting-aow-table`** — `ratioBase()` filters out `__isIntermediateCrosscut` rows (both the `__allIndicators` side-channel and `indicators`). Rows still render (R-7). `ratioTitle` unchanged (now over the own set). *Delivered in KCR-T-2 together with the host rewire, because the regression spec's table identity cannot go green without it.*
- **`reporting-program-band`** — `ReportingSummaryStats` gains optional `plannedKpis`, `zeroTargetKpis`; Total KPIs figure gets `[attr.title]` built by a component method: `<planned> planned · excludes <zt> zero-target KPI` / `…KPIs` (pluralised exactly like `reporting-aow-table.countLabel`) when `zt > 0`, else `<planned> planned`. No template arithmetic.
- **`program-overview`** — chip `title` = `excludes N zero-target KPI` / `…KPIs` when the row's `zeroTarget > 0`; its own `AowProgressRow` type gains optional `zeroTarget` (mirrors the host's `OverviewAowProgressRow`). Rail already sums `richRows` → SP01 `2 of 357`, and KCR-R-3 states `rail = Σ rows`, `band = rail + chips` — no rail change. The OAH DD-4 comment at the `aowProgress`/`xcutProgress` inputs is updated to the new basis.
- **`reporting-entry-hub`** — `HubAowRow` gains optional `zeroTarget`; the AoW row's figure carries the same `title` as the chips when `zeroTarget > 0` (KCR-R-2.1). Program-level rows reuse the chip row's `zeroTarget`.
- **`dashboard-lab.toc-map.ts`** — `buildLeaf` computes `done/total` with the zero-target rule (`buildRatio` over the node's indicators) while `leaf.indicators` keeps the planned count (the two differ by design: planned vs counted); AoW branch sums **all its leaves** (outputs + owned outcomes) — the leaf list already excludes program nodes (`is_aow !== true`). The deduplicated **Program-level branch is suppressed when the Intermediate-outcomes branch is non-empty** (KCR-R-5.1, KCR-DD-7); it stays as fallback otherwise. Comment at TCM-R-3 updated to the new rule.
- **`reporting-burndown.ts` header docblock** — the paragraph recording the old divergence ("Every OTHER Overview computed … keep TODAY'S rule") is rewritten: every shell surface now delegates here.

### 6.4 Design system / a11y
- No new tokens, classes or copy besides `title` attributes (existing MRF wording). No i18n keys (the shell is English-only today, consistent with siblings).

## 7. Security & Authorization
No change.

## 8. Performance & Capacity
One extra memoised `computed` (O(n) over ~500 indicators). `buildRatio` is already O(n). No new requests.

## 9. Observability
None.

## 10. Testing Plan

- **Helper unit tests** (`reporting-burndown.spec.ts`): the KCR-R-1 fixture — count-once, own/crosscut split, bucket dedupe, `summarisePartition` totals (planned 11 / zero-target 2 / counted 9).
- **Regression test (red → green)** (`dashboard-lab.kcr-reconciliation.spec.ts`, new): mounts `DashboardLabComponent` with the fixture in `tocByKey`, asserts KCR-AC-1 identities across `plannedReportingSummaryStats`, `overviewAowProgress(Rich)`, `overviewXcutProgress`, `reportingGroups` + `ratioOf`, `hubProgramLevelRows`, `plannedAowBanner`, `tocMapModel`; KCR-AC-3 filter invariance; KCR-AC-6 documented red values.
- **Component DOM tests**: band `title` text (KCR-AC-2 wording), chip `title`, A's Outcomes-band cross-cut rows still present (KCR-AC-5).
- **Fixture updates** in the seven pinned suites (hub, oah-rows, scope, oah-hero, band, aow-table, toc-map): numbers move to the new basis; **no `expect` may be deleted** (Reviewer checks `git diff -- '*.spec.ts'` for removed assertions).
- **Live check** (KCR-AC-7): `evidence/reconcile.browser.js` + on-screen read at the final checkpoint.

## 11. Backwards Compatibility & Migration
Additive interface fields; no flags; rollback = revert the PR.

## 12. Design Decisions

### `KCR-DD-1` — Partition lives in `reporting-burndown.ts`, not a new file
- **Context:** the drift came from three files each owning a basis. MRF fixed the same class by single-homing predicates here.
- **Decision:** extend the existing home; export two pure functions.
- **Alternatives:** a new `program-kpi-partition.ts` (cleaner file size, but a second "home" for KPI arithmetic — the very thing that drifted); computing inside `indicatorsByAow()` (would couple the raw bundle to the policy and break the panel views that need cross-cuts visible).
- **Consequences:** `reporting-burndown.ts` grows ~50 lines; its spec becomes the authority for count-once.

### `KCR-DD-2` — AoW rows switch basis to AoW-own (supersedes OAH DD-3 / TCM-R-3 wording)
- **Context:** outputs-only rows cannot reconcile with the grouped table or the band without hiding AoW-owned outcomes somewhere.
- **Decision:** rows = outputs + `is_aow: true` outcomes. Program-level outcomes stay in chips/buckets.
- **Alternatives:** keep outputs-only and add a third hero figure for owned outcomes (more UI, still three numbers per AoW); exclude owned outcomes from the band (hides planned KPIs).
- **Reversion challenge (§12 rule — "what does removing outputs-only break?"):** the ToC map's TCM-R-3 test and `oah-rows`/`oah-hero` fixtures pin outputs-only; the hub REH-R-2 basis changes numbers but no behaviour. Nothing user-visible depends on the AoW row *excluding* an owned outcome — the grouped table already includes it. **Outcome: proceed; fixtures updated in KCR-T-4.**

### `KCR-DD-3` — Cross-cut rows drop out of AoW ratios but stay rendered
- **Context:** RES-R-3 deliberately shows cross-cut IOs inside each AoW card with a tooltip.
- **Decision:** visibility unchanged; only `ratioBase()` and `count` exclude them.
- **Alternatives:** stop rendering them in AoW cards (contradicts RES-R-3, loses the "this AoW contributes to this IO" cue); count them in AoWs and drop the IO card (hides the program-level view).
- **Reversion challenge:** removing cross-cuts from `ratioBase` breaks nothing rendered; `ratioTitle`'s zero-target count shrinks accordingly (correct — it now describes the same set as the ratio). MRF-AC-5/6 fixtures without cross-cuts are unaffected.

### `KCR-DD-4` — Band shows *Counted*, discloses *Planned* in `title` (resolves proposal OQ-3)
- **Context:** every other denominator on the shell is Counted; a Planned headline would be the one number that does not add up.
- **Decision:** big figure = Counted; `title` = planned + zero-target; popover "planned results" = Planned.
- **Alternatives:** show Planned big and Counted in the subline (headline ≠ denominators); show both figures inline (band card real estate, copy change).

### `KCR-DD-5` — ToC-map leaf totals adopt the zero-target rule
- **Context:** TCM-R-3 requires the AoW node to equal the hero row; the hero row applies the rule, the leaf did not.
- **Decision:** `buildLeaf` uses `buildRatio`; branch sums own leaves.
- **Reversion challenge:** removing the unfiltered leaf total changes the map's node labels for nodes with zero-target KPIs (fewer in `total`). No navigation, colour or click behaviour keys off `total`. Fixtures in `toc-map.spec` updated.

### `KCR-DD-7` — ToC map shows cross-cut IOs once (Program-level branch suppressed when the IO branch exists)
- **Context:** the map builds a deduplicated "Program-level" branch from the `is_aow !== true` nodes of AoW payloads (TCM-DD-5) **and** an "Intermediate outcomes" branch from the IO endpoint — the same 7 KPIs twice, violating KCR-R-1.
- **Decision:** when the IO branch has ≥ 1 leaf, drop the Program-level branch; otherwise keep it (the IO endpoint failed or returned nothing — the AoW payloads are then the only source).
- **Alternatives:** merge both into one branch keyed by `toc_result_id` (more code, same result); keep both and exempt the map from R-1 (keeps the exact double display the report complained about).
- **Reversion challenge — "what does removing the Program-level branch break?":** `dashboard-lab.toc-map.spec.ts` asserts the branch under TCM-DD-5 with a fixture that has no IO endpoint data → those assertions still hold (fallback path); a fixture with both sources changes the expected branch list → assertions updated in KCR-T-4 with an explicit `// KCR-DD-7` comment (the one sanctioned assertion *change*, not deletion). Click-through (`TCM-R-5`) keys on `kind === 'aow'` only — unaffected.

### `KCR-DD-6` — By-AOW banner uses the own set, list stays HLO-only
- **Context:** MRF-R-6 pins banner = grouped header ratio. The By-AOW list is HLO groups by design.
- **Decision:** banner stats over `own` (so it equals the header); the HLO list is untouched.
- **Consequence (accepted, disclosed):** for an AoW with owned outcomes the banner counts 1–6 KPIs not listed below it. Recorded in §13; a follow-up may add an Outcomes band to the By-AOW view.

## 13. Open Gaps & Follow-ups
- **Follow-up A:** server roll-up `indicators_total` includes cross-cuts (`115 of 144` beside `1 of 110`) — proposal OQ-1, separate spec.
- **Follow-up B:** By-AOW view could list owned outcomes (KCR-DD-6 consequence).
- **Risk:** `changes/aow-filter-popover` touches `reporting-aow-table.component.ts` and `dashboard-lab.component.ts` — execute this spec after it lands or rebase KCR-T-2/T-3 on it.

## 14. Budget (Step 2.4 re-size)

| Metric | Estimate | Note |
|---|---|---|
| Tasks | **5** | helper + regression test (red), host rewire (+ table ratio base, ToC map), titles (band, chips, hub), fixture updates, live check + docs |
| LOC | **~300** | ≈110 source, ≈190 tests/fixtures |
| Review rounds | **≤ 1 per task** | per standing feedback; a second FAIL escalates |

Phase-0 guess was Standard; the design resolves to 5 tasks / ~300 LOC → **Standard confirmed** (above Lite's one-task shape, well below Full). `/akili-execute` trips on > 6 tasks, > 450 LOC or a second Reviewer round on any task.

## 15. Judgment-day
Run once (2026-09-03, two blind judges on a different model): 6 severe findings confirmed by both → applied here and in `requirements.md`/`tasks.md`; warnings applied by the author where cheap, recorded as `info`. No re-judgment (standing feedback). Ledger: `judgment.md`.

## Required cross-references
- `requirements.md` (same folder); `docs/prd.md` US-P1, G1; `docs/ux-ui/design.md` §4; `docs/trd/trd.md` §2 `result-framework-reporting`.
- Archived: `mass-reporting-flow` (MRF-R-6/R-7, `buildRatio` home), `overview-aow-progress-hero` (OAH DD-3 superseded), `overview-toc-map` (TCM-R-3 wording superseded), `results/intermediate-outcome-aow-visibility` (RES-R-3 `is_aow`).
