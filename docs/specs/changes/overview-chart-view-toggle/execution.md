# `changes/overview-chart-view-toggle` — Execution Log

## 1. Document Control

| Attribute | Value |
|---|---|
| **Spec** | `docs/specs/changes/overview-chart-view-toggle/` |
| **Approval mode** | gated (requirements §1) — user launched `/akili-execute … fast and efficient`: Leader proceeds through routine PASS gates and stops at the CVT-T-3 HITL (which requires the user regardless); deviation recorded here |
| **Branch** | `qa-development-2026` @ base `b4d479cb3` |
| **Triad** | Leader: session model (T1 role) · Implementer: `akili-implementer` wrapper (T2) · Reviewer: `akili-reviewer` wrapper (T3, read-only) — author ≠ auditor held |
| **Budget (design §1)** | 3 tasks · ~300 LOC · 1 review round |

## 2. Task Execution History

## CVT-T-1 — Pure builders: `stackedBarOption` + `barLinkFromClick` (+ shared morph ids)

- **Status:** PASS (attempt 1 of max 3) · **Date:** 2026-08-27
- **Implements:** CVT-R-2 (builder side), CVT-R-3 (full parity), CVT-R-5 (shared ids + universalTransition)
- **Skills assigned:** `angular-developer`, `tdd` · effort medium

### Attempt 1

- **Files changed:** `program-overview.charts.ts` (+92), `program-overview.charts.spec.ts` (+137) — diff confined to these two.
- **What:** `datasetIdsFor(model)` (`col-${c}` per column) · `stackedBarOption(model, ramp)` (yAxis=rows `inverse`+`interval: 0`+`abbreviateAxisLabel`, xAxis value, one `bar` series per column `stack: 'total'`, full column names, `ramp[c % len]`, row-aligned data with `0 → null`, tooltip `row × col: N` + "(not navigable)", no legend/bar-end totals per CVT-DD-5) · `barLinkFromClick(event, model)` (`seriesIndex→c`, `dataIndex→r`, null-safe) · only heatmap-path edit: series `id: 'heatmap-matrix'` + `universalTransition: {enabled, seriesKey: datasetIdsFor(model)}` (ECharts one-to-many split, CVT-DD-4). Specs: asymmetric 2×4 distinct-value fixture; option shape; full-matrix parity loop (all 8 cells incl. null links) `barLinkFromClick ≡ cellLinkFromClick`; ramp-index color assertions (KZ-SPO-1, `!startsWith('#')`); shared-ids equality; guard cases.
- **Implementer verification:** `npx jest --silent --reporters=summary --no-coverage` → **482 suites / 6888 tests passed** (full suite). `npx ng lint --quiet` → all files pass. No hex, no `package.json`.
- **Reviewer verdict:** **STATUS: PASS** — "`stackedBarOption`/`barLinkFromClick`/`datasetIdsFor` conform to design §2.2 items 3–5 and CVT-DD-3/4/5; all five DoD items satisfied with behavioral assertions." **Adjudication:** the DoD's literal "both builders' series ids equal" is unsatisfiable for a 1↔N morph; the implemented `seriesKey` split (heatmap `seriesKey: ['col-0'…]` ↔ bar series `id: 'col-N'`) is the documented ECharts 1↔N grouping (`findTransitionSeriesBatches`) and the identity set is shared and single-sourced — intent and letter satisfied as closely as the engine permits; the divergent-ids FAIL input still bites. Reviewer confirmed `BarChart`/`UniversalTransition` registered in the wrapper (`pr-viz-chart.component.ts:41–50`).

### ADVISORY (4R, non-gating — recorded, not tasked)

1. **RISK:** ramp is 4 colors; the bilateral matrix has 7 columns → `ramp[c % 4]` gives columns 5–7 the same fills as 1–3, and same-colored segments inside one stacked bar are not separable by eye (design-prescribed modulo; tooltip still disambiguates). **Forward pointer → CVT-T-3:** the HITL must explicitly check ramp collision on the bilateral card, not just W1/W2.
2. **READABILITY:** `% ramp.length` wrap never exercised by tests (fixture is 4×4); a 2-entry-ramp assertion would pin cycling.
3. **RELIABILITY:** CVT-R-2 *Empty model* (builder side) is in the task's Implements but in no DoD/§10 test row; behavior verified correct by code inspection (`rows: []` → empty arrays, `cols: []` → `series: []`, no throw) — traceability gap only. Component-side empty state is CVT-T-2's.

- **Decisions:** Leader accepted the Reviewer's shared-ids adjudication (spec intent over unsatisfiable letter); no spec edit needed — recorded here instead.
- **Issues:** Reviewer's verdict initially not delivered to the Leader (idle without report); recovered via direct message — no work lost, no attempt consumed.
- **Final verification:** full suite green (482/6888), lint clean.
- **Gate:** auto-advanced to CVT-T-2 per the user's fast directive (see Document Control).
