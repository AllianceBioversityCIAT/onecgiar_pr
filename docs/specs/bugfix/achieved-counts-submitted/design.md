# `bugfix/achieved-counts-submitted` — Design

**Depth:** Standard (Bug Mode) · **Status:** draft · Implements `requirements.md` `ACS-R-1..5`, `ACS-NFR-1..4`

## 1. Document Control

| Field | Value |
|---|---|
| Spec path | `docs/specs/bugfix/achieved-counts-submitted` |
| Approval Mode | `gated` |
| Baseline | `docs/trd/trd.md` §Results Framework Reporting · `docs/ux-ui/design.md` §7 tokens |
| Related | `bugfix/indicator-achieved-value-per-center` (RFR-DD-2, union `achieved_value_sum`), archived P2-3296 (QA/Prel bars, `toc-progress-rollup.ts`), `bugfix/kpi-count-reconciliation` (`summarisePartition`) |

## 2. Executive Summary

Two moves, both small:

1. **Server (additive):** carry the union-basis figure the whole way up — a per-indicator `achieved_progress_percentage` and, on every roll-up, `achieved_value` + `achieved_progress_percentage`. Existing fields untouched.
2. **Client (one choke point):** a pure *display-basis* normaliser applied inside the four `ResultsApiService` methods that return ToC progress. With the split switch off it re-points the fields every surface already binds to (`actual_achieved_value_sum`, `progress_percentage`, `progress_value`) at the union basis. Templates only change to hide the QA/Prel pair.

Result: ~20 existing bindings across 8 components get the right number **without being edited**, and no surface can be missed.

## 3. Architecture Overview

| Layer | Today | After |
|---|---|---|
| SQL `getIndicatorContributions` / `…ByCenter` | returns QA, Prel, union sums | unchanged (`ACS-NFR-1`) |
| `fetchAndGroupTocResults` → `groupTocRows` | indicator gets QA % + Prel % + `achieved_value_sum` | + `achieved_progress_percentage` |
| `toc-progress-rollup.ts` | `actual`, `preliminary` | + `achieved` (same filter, same mean) |
| `results-framework-reporting.service.ts` `rollUpChildren` callers (AoW, SP) | QA + Prel | inherit `achieved` automatically |
| `ResultsApiService` 4 methods | raw payload | `map(toDisplayBasis)` |
| Templates | QA + Prel pair | `@if (showQaPrelSplit)` pair, `@else` single figure |

Data flow: SQL → mapper → rollup → JSON → **normaliser** → signals/caches → every binding.

## 4. Extended Directory Structure

```
onecgiar-pr-server/src/api/results/results-toc-results/repositories/
├── toc-progress-rollup.ts            (+ achieved)
├── toc-progress-rollup.spec.ts       (+ cases)
├── aow-bilateral.repository.ts       (+ achieved_progress_percentage)
└── aow-bilateral.repository.spec.ts  (+ cases)
onecgiar-pr-client/src/app/shared/
├── constants/achieved-display-basis.ts       (NEW — switch + normaliser, pure)
├── constants/achieved-display-basis.spec.ts  (NEW)
└── services/api/results-api.service.ts       (4 methods piped)
onecgiar-pr-client/src/app/pages/result-framework-reporting/pages/
├── dashboard-lab/components/reporting-aow-table/*.html|ts   (hide pair)
├── dashboard-lab/components/program-overview/*.html|ts      (hide pair)
├── dashboard-lab/dashboard-lab.component.html|ts            (hide PREL chips)
├── entity-aow/.../aow-hlo-table/*.html                      (hide Prel column/bar)
└── entity-details/components/entity-aow-card/*.html         (hide Prel.)
```

## 5. Data Model

No schema change, no migration. Status sets (from SQL, unchanged): QA (2, 6) · Prel (3, 6) · **Achieved (2, 3, 6)**. A result carries one `status_id`, so the union sum never double counts (`ACS-S-2`).

## 6. API Design

Endpoints unchanged (`GET_TocResultsByAowId`, `GET_IntermediateOutcomes`, `GET_2030Outcomes`, `GET_ScienceProgramTocProgress` server routes). Additive fields:

| Object | New field | Meaning |
|---|---|---|
| indicator | `achieved_progress_percentage: string` | `achieved_value_sum / target`, formatted like `progress_percentage` |
| `progress` (node, AoW, SP) | `achieved_value: number \| null` | mean of children's union % (null = nothing measurable) |
| `progress` | `achieved_progress_percentage: string \| null` | formatted `achieved_value` |

`achieved_value_sum` on the indicator already ships. Not a `/api/bilateral/*` surface → no bilateral change-log row.

## 7. Backend Module Design

- **`toc-progress-rollup.ts`** — `RollupIndicator` gains `achieved_value_sum`; `NumericRollup` gains `achieved`; `rollUpIndicatorsNumeric` computes it with the same `hasUsableTarget` filter as the other two; `rollUpChildren` averages children's `achieved_value` over the **same** `measurable` set (keyed on `progress_value !== null`, which depends on targets only, so the set is identical for all three bases — `ACS-S-7` BUT clause). `present` emits the two new fields.
- **`aow-bilateral.repository.ts`** — in `fetchAndGroupTocResults` compute `achieved_progress_percentage` from `achieved` with the existing `calculateProgressPercentage`/`formatProgressPercentage`; `groupTocRows` lists it explicitly (that object whitelists fields — the trap P2-3296 already noted). Per-center path (`sumContributionsForCenters`) already yields `achieved_value_sum`.
- **Zero target:** `calculateProgressPercentage` keeps its `value * 100` branch for the row; the roll-up excludes it as today (`ACS-S-6`).

## 8. Frontend / UX Component Architecture

### 8.1 Normaliser (`achieved-display-basis.ts`)

- `SHOW_QA_PREL_SPLIT = false` — the one switch (`ACS-R-5`, `ACS-S-10`).
- `toDisplayBasis(payload)` — walks the four response shapes (`tocResults[]`, `tocResultsOutputs[]`, `tocResultsOutcomes[]`, `progress`, `areas[].progress`, each node's `indicators[]` and `progress`). When the switch is off:
  - indicator: `actual_achieved_value_sum ← achieved_value_sum`, `progress_percentage ← achieved_progress_percentage`.
  - rollup: `progress_value ← achieved_value`, `progress_percentage ← achieved_progress_percentage`.
  - the original QA values are kept under `qa_*` keys (client-only) so nothing is lost.
  - **Guard:** a field is re-pointed only when the union counterpart is present; an old server (no new field) leaves the payload as-is (deploy-order safety).
  - Switch on → identity function.
- Applied with `.pipe(map(...))` in the four `ResultsApiService` methods. Every consumer listed in `proposal.md` §5 plus `guided-creation`, `lab-report-form`, `where-to-report-modal`, `results-center-reporting-guide`, `entity-aow.service` and the Home galaxy client inherit it.

Why this covers each requirement with no per-surface edit:

| Requirement | Binding that already exists |
|---|---|
| `ACS-R-1` Achieved cell, HLO sum | `achievedText`, `hloAchievedSum`, aow-hlo-table `:134`, dashboard-lab `:288/:604/:684/:2048/:2074`, drawer `:537` |
| `ACS-R-2` % + badge | `statusOf`/`progressOf`, `statusChip(progress_percentage)`, aow-hlo-table `getStatusLabel` |
| `ACS-R-3` roll-ups | `achievementLabel(progress_percentage)`, `progress_value` bar widths |
| `ACS-R-4` counts | `reporting-burndown.achievedOf`, `toc-map` `:145` |

### 8.2 Hiding the pair (`ACS-S-9`)

Each component exposes `showQaPrelSplit = SHOW_QA_PREL_SPLIT`. Templates: `@if (showQaPrelSplit)` keeps today's two-track block verbatim; `@else` renders **one** track — the existing QA bar markup without the "QA" label, using its current classes (`bg-emerald-500` / `progress-cell_fill--qa` fill, same height). No new component, no Spartan change. Tooltips/`aria-label` builders that concatenate "QA … and Preliminary …" (`reporting-aow-table.ts:1109`, `program-overview.ts:774`) branch on the same flag to a single-figure sentence ("ToC achievement — x% …").

Surfaces: reporting-aow-table (row cell ×2 layouts, AoW header `:447-464`, HLO header `:826-830`), program-overview (hero `:545-552`, AoW rows `:875-884`), dashboard-lab `:1627`, `:1825`, aow-hlo-table Prel column/bar `:158-169`, entity-aow-aow AoW header `:44-57` (added at T-4 review), entity-aow-card `:43`.

### 8.3 States

Loading/empty/error unchanged. Empty Achieved ("Nothing reported yet") now triggers only when union = 0.

## 9. Shared Contracts

Server `ProgressRollup` and client `TocAchievement` / `ReportingIndicator` interfaces gain the optional new fields. `qa_*` keys are client-only, documented in the normaliser.

## 10. Design Decisions

| ID | Decision | Rejected | Why |
|---|---|---|---|
| `ACS-DD-1` | Normalise at the API service (one choke point) | Edit ~20 bindings per surface | Proposal undercounted surfaces (grep found 8 components + 4 other callers). Per-binding edits will miss one; the choke point cannot. Satisfies `ACS-S-10` (client-only flip) |
| `ACS-DD-2` | Re-point existing field names client-side | Rename bindings to `achieved_*` | Zero template churn for numbers; cost is that `actual_*` means "display basis" in the client — mitigated by doc comment + `qa_*` copies |
| `ACS-DD-3` | Server adds roll-up `achieved` | Client recomputes roll-ups | Roll-ups are means of ratios with target exclusion; recomputing in the browser duplicates `toc-progress-rollup` and drifts |
| `ACS-DD-4` | Hide via `@if` flag, keep markup | Delete QA/Prel markup | Nicoleta said "for now"; restoring = one constant |
| `ACS-DD-5` | Guard: re-point only when the union field exists | Unconditional | Client may deploy before server; avoids showing 0/undefined |

### 10.1 Reversion challenge (Step 2.3) — `ACS-DD-4` hides P2-3296's QA/Prel display

Question: *what does removing it break?*

| Breakage | Addressed by |
|---|---|
| Jest/Cypress assertions on "QA"/"Prel." text and two bars (`reporting-aow-table.row-layout.cy.ts`, `program-overview.row-layout.cy.ts`, `aow-hlo-table.component.spec.ts`, `entity-aow-card.component.spec.ts`, `program-overview.scope.spec.ts`, `reporting-aow-table.component.spec.ts`) | Task T-4 updates them to the single-figure default and keeps one case per suite with the flag on |
| a11y names that say "QA … and Preliminary …" | §8.2 branch |
| Report button now enabled on submitted rows (status rule) | Intended — assumption A-4 |
| `isOverachievedWithoutTarget` reads `actual || preliminary` | Still correct (union ≥ both) |
| Home galaxy client switches basis while server-side galaxy/Excel (`results.service.ts:1670`) stays QA | **Update to A-2:** galaxy *client card* follows the normaliser; only Excel and the server-built dashboard stay QA. Recorded as accepted inconsistency until follow-up |

Challenge outcome: no unaddressed breakage.

## 11. Rollout & Rollback

- Order-independent (`ACS-DD-5`). Server and client can ship in one PR.
- Rollback: set `SHOW_QA_PREL_SPLIT = true` (client-only), or revert PR. No data touched.
- Post-deploy check on testing: 30983 (SF AoW5/HLO 5.3 CIMMYT) and an active status-3 SAAF result. 31037 was soft-deleted after the ticket screenshot (pre-flight SQL, 2026-10-02) and correctly counts 0.

## 12. Budget (tripwire for `/akili-execute`)

| Metric | Estimate |
|---|---|
| Tasks | 5 |
| LOC (prod + tests) | ~350 (server ~70, normaliser ~80, templates ~90, spec updates ~110) |
| Review rounds | 2 |

Depth check: matches Standard. Not Lite (multi-surface + roll-up), not Full (no API break, no data).
